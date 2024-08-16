function readPackage(pkg) {
  // Aliasses all of the `@ladle/react` calls to the local `ladle-react-native`
  // We need that to keep the existing import statements and dependency definitions intact.
  // Should make life easier by reducing potential conflicts with upstream.
  if (pkg.dependencies && pkg.dependencies["@ladle/react"]) {
    pkg.dependencies["@ladle/react"] = "workspace:ladle-react-native@*";
  }
  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
