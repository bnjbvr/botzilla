const presets = [
  [
    "@babel/env",
    {
      targets: {
        node: "10"
      },
      useBuiltIns: "usage",
    },
  ],
];

module.exports = { presets };
