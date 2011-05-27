function loader(scripts) {
  for (var i=0; i < scripts.length; i++) {
    document.write('<script src="'+scripts[i]+'"><\/script>')
  };
};



loader([
  "/js/functional.js",
  "/js/app/monkypatch.js",
  "/js/jquery-1.4.2.js",
  "/js/app/utils.heap.js",
  "/js/app/sonarcrm.graph.js"
]);