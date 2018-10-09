function Forces (tick) {
  this.simulation = d3.forceSimulation()
      .force('x', d3.forceX(0))
      .force('y', d3.forceY(0))
      .force('link', d3.forceLink().id(function(d) {return d.id;}))
      .force('charge', d3.forceManyBody().strength(-200))
      .on('tick', tick);

  this.simulation.force('x').strength(0.02);
  this.simulation.force('y').strength(0.03);
}

Forces.prototype.update = function (vertices, edges) { //function (vertices, edges)
  this.simulation.nodes(vertices);
  this.simulation.force('link')
    .links(edges)
    .distance(100)
    .strength(0.2);
}

Forces.prototype.restart = function (alpha) {
  this.simulation.alpha(alpha).restart();
}

export { Forces };
