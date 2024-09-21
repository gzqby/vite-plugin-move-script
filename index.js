const posthtml = require("posthtml");
const { readFileSync, writeFileSync } = require( "fs");
const { resolve } = require("path");
const { render } = require("posthtml-render");

const loop = ({ array, flag, tags }) => {
  let insertIndex;
  for (let index = 0; index < array.length; index++) {
    const element = array[index];
    if (typeof element === "object") {
      const { tag, attrs } = element;
      if (tag === "html") {
        loop({ array: element.content, flag, tags });
      } else if (tag === "head") {
        loop({ array: element.content, flag: "head", tags });
        const arr = [];
        for (let index = 0; index < element.content.length; index++) {
          const item = element.content[index];
          if (item) {
            arr.push(item);
          }
        }
        element.content = arr;
      } else if (tag === "body") {
        loop({ array: element.content, flag: "body", tags });
      }
      if (
        flag === "head" &&
        (tag === "script" ||
          (tag === "link" && attrs?.href && /.(css|js)/gi.test(attrs?.href)))
      ) {
        tags.push(element);
        array[index] = undefined;
        if (/[\r\n]/.test(array[index - 1])) {
          array[index - 1] = undefined;
        }
      }
    }
    if (flag === "body" && element === "<!-- move-to-here -->") {
      insertIndex = index;
    }
  }
  if (typeof insertIndex === "number") {
    array.splice(insertIndex + 1, 1, ...tags);
  }
};

const handler = (array) => {
  const tags = [];
  loop({ array, tags });
};

const moveScript = () => {
  let outputDir;
  return {
    name: "vite-plugin-move-script",
    apply: "build",
    configResolved(config) {
      outputDir = config.build.outDir || 'dist';
    },
    closeBundle() {
      const indexPath = resolve(outputDir, "index.html");
      const html = readFileSync(indexPath, "utf-8");
      posthtml()
        .process(html)
        .then((result) => {
          const ast = result.tree;
          handler(ast);
          const newH = render(ast);
          writeFileSync(indexPath, newH);
        });
    },
  };
};

module.exports = moveScript;