const fs = require("fs");
const maximage = require("../userscript.user.js");

var split_value = function(lines, cmd, value) {
    var splitted = value.split("\n");

    for (var i = 0; i < splitted.length; i++) {
        var header = "";
        var line = splitted[i];

        if (i === 0) {
            header = cmd + " ";

            if (splitted.length > 1) {
                lines.push(header + '""');
                header = "";
            }
        }

        if ((i + 1) < splitted.length)
            line += "\n";

        if (line.length === 0)
            continue;

        lines.push(header + JSON.stringify(line));
    }
};

var start = function(userscript) {
    var pofiles = {};

    var supported_language_names = {
        "en": "English",
        "es": "Spanish",
        "fr": "French",
        "ko": "Korean"
    };

    var supported_languages = userscript.match(/\n\tvar supported_languages = (\[(?:\n\t{2}"[-a-zA-Z]+",?)*\n\t\]);\n/);
    if (!supported_languages) {
        console.error("Unable to find supported languages match in userscript");
        return;
    }
    var supported_languages_json = JSON.parse(supported_languages[1]);
    const language_options = maximage.internal.settings_meta.language.options;
    for (var supported_language of supported_languages_json) {
        var old_supported_language = supported_language;
        if (supported_language === "en") {
            supported_language = "imu";
        } else {
            supported_language = supported_language.replace(/-/, "_");
        }

        pofiles[supported_language] = [];

        if (supported_language !== "imu") {
            var language_name = supported_language_names[supported_language] || supported_language;
            pofiles[supported_language].push("# " + language_name + " translations for Image Max URL");
            pofiles[supported_language].push("#");
        }

        pofiles[supported_language].push("msgid \"\"");
        pofiles[supported_language].push("msgstr \"\"");
        pofiles[supported_language].push("\"Project-Id-Version: Image Max URL\\n\"");
        pofiles[supported_language].push("\"MIME-Version: 1.0\\n\"");
        pofiles[supported_language].push("\"Content-Type: text/plain; charset=UTF-8\\n\"");
        pofiles[supported_language].push("\"Content-Transfer-Encoding: 8bit\\n\"");

        if (supported_language !== "imu") {
            pofiles[supported_language].push("\"Language: " + supported_language + "\\n\"");
        }

        pofiles[supported_language].push("");

        pofiles[supported_language].push("# Native language name (e.g. Français for French, 한국어 for Korean)")
        pofiles[supported_language].push("msgid \"$language_native$\"");
        if (supported_language !== "imu" && old_supported_language in language_options) {
            split_value(pofiles[supported_language], "msgstr", language_options[old_supported_language].name);
        } else {
            pofiles[supported_language].push("msgstr \"\"");
        }

        pofiles[supported_language].push("");
    }

    var strings = userscript.match(/\n\tvar strings = ({[\s\S]+?});\n/);
    if (!strings) {
        console.error("Unable to find strings match in userscript");
        return;
    }

    var strings_json = JSON.parse(strings[1]);

    for (const string in strings_json) {
        var string_data = strings_json[string];

        var comment = null;
        if (string_data._info) {
            comment = "#. ";

            var instances_text = [];
            for (const instance of string_data._info.instances) {
                instances_text.push(instance.setting + "." + instance.field);
            }

            comment += instances_text.join(", ");
        }

        for (const pofile in pofiles) {
            if (comment) {
                pofiles[pofile].push(comment);
            }

            split_value(pofiles[pofile], "msgid", string);

            if (pofile !== "imu" && pofile in string_data) {
                split_value(pofiles[pofile], "msgstr", string_data[pofile]);
            } else {
                pofiles[pofile].push("msgstr \"\"");
            }

            pofiles[pofile].push("");
        }
    }

    for (const pofile in pofiles) {
        var ext = "po";
        if (pofile === "imu")
            ext = "pot";

        var filename = "po/" + pofile + "." + ext;
        fs.writeFileSync(filename, pofiles[pofile].join("\n"));
    }
};

var userscript = fs.readFileSync(process.argv[2] || "userscript.user.js").toString();
start(userscript);
