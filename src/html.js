function helper(tag) {
  return (attributes, ...children) => {
    let maybeAttributes = "";
    if (Object.keys(attributes).length) {
      maybeAttributes =
        " " +
        Object.keys(attributes)
          .map(key => {
            return `${key}="${attributes[key]}"`;
          })
          .join(" ");
    }
    return `<${tag}${maybeAttributes}>${children.join(" ")}</${tag}>`;
  };
}

const ELEMENTS = ["p", "ul", "li", "strong", "a"];

module.exports = {};
for (const el of ELEMENTS) {
  module.exports[el] = helper(el);
}

if (module.parent === null) {
  // Tests.
  let expected = `<p>hello <a href="https://www.google.com">google</a> world</p>`;
  let _ = module.exports;
  let observed = _.p(
    {},
    "hello",
    _.a({ href: "https://www.google.com" }, "google"),
    "world"
  );
  if (expected !== observed) {
    throw new Error(`Assertion error, expected:
        ${expected}
        Observed:
        ${observed}`);
  }
}
