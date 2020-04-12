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

export const p = helper("p");
export const ul = helper("ul");
export const li = helper("li");
export const strong = helper("strong");
export const a = helper("a");

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
