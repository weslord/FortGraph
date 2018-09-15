'use strict';
{ // INIT
  var windowWidth  = window.innerWidth,
      windowHeight = window.innerHeight;

  var width  = windowWidth - 258,
      height = windowHeight - 10;

  var color = d3.scaleOrdinal(d3.schemeCategory10);

  var svg = d3.select('body').append('svg')
      .attr('width', width)
      .attr('height', height);

  var world = svg.append('g')
      .attr('id', 'world')
      .attr('transform', 'translate('+width/2+','+height/2+')');

  svg
    .call(d3.zoom()
        .scaleExtent([1/8, 2])
        .on('zoom', zoomed))
    .call(d3.zoom().transform, d3.zoomIdentity.translate(width/2, height/2))
    .on('dblclick.zoom', null);

  var buildings = world.selectAll('g');
  var lines     = world.selectAll('line');

  var linePreview = world
      .append('line');

  var inspector = {};
  inspector.body = d3.select('body').append('div')
      .attr('id', 'inspector');
  inspector.title = inspector.body.append('input')
      .on('change', function () {
        if (this.value == '') {
          this.value = selected.title;
        } else {
          selected ? selected.title = this.value : null;
          updateInspector(selected);
          update();
        }
      });
  inspector.type = inspector.body.append('input')
      .on('change', function () {
        selected ? selected.type = this.value : null;
        update();
      });
  inspector.from = inspector.body.append('div').classed('from', true);
  inspector.to = inspector.body.append('div').classed('to', true);
  inspector.focus = function () {
    d3.event.stopPropagation();
    inspector.title.node().select();
  }

  var vertices = [];
  var edges = [];

  d3.text('industries.json').then(function(g){
    importGraph(g);
  });

  var source = null,
      target = null,
      selected = null,
      line   = null; // rename this (represents an edge)

  var dragging = true;
  var ctrlPressed = false;
  
  window.addEventListener("resize", resize);

  svg.on('dblclick', newVertexAtMouse);
  svg.on('click', selectObj);

  d3.select(window)
    .on('keydown', windowKeydown)
    .on('keyup', windowKeyup);

  var simulation = d3.forceSimulation()
      .force('x', d3.forceX(0))
      .force('y', d3.forceY(0))
      .force('link', d3.forceLink().id(function(d) {return d.id;}))
      .force('charge', d3.forceManyBody().strength(-200))
      .on('tick', tick);

  simulation.force('x').strength(0.02);
  simulation.force('y').strength(0.03);

  update();
}

function update() {
  lines = lines.data(edges);
  var enter = lines.enter().append('line')
      .on('click', selectObj)
      .on('mouseover', lineHover)
      .on('mouseout', lineUnHover);
  lines.exit().remove();
  lines = lines.merge(enter);

  buildings = buildings.data(vertices, function(d) {
    return d.id;
  });
  buildings.exit().remove();
  enter = buildings.enter().append('g')
      .on('click', selectObj)
      .on('dblclick', inspector.focus)
      .on('mouseover', bldgHover)
      .on('mouseout', bldgUnHover)
      .call(d3.drag()
        .on('start', bldgDragStart)
        .on('drag', bldgDragProgress)
        .on('end', bldgDragEnd)
      );
  enter.append('text');
  enter.append('rect');

  buildings = buildings.merge(enter);

  buildings.classed('selected', function (d) {
    return d.selected;
  });
  lines.classed('selected', function (d) {
    return d.selected;
  });

  buildings.selectAll('text')
      .text(function(d) {return d.title;})
      .attr('height', 10)
      .attr('transform', function() {
         var b = this.getBBox();
         return 'translate(-'+ b.width/2 +','+ 10/2 +')';
        });
  buildings.selectAll('rect')
      .each(function(d) {
        var b = this.parentNode.querySelector('text').getBBox();
        var w = b.width + 5;
        d3.select(this)
          .attr('width', w)
          .attr('transform', 'translate(-'+ w/2 +','+ -10 +')')
          .attr('stroke', color(d.type))
          .attr('rx', 5)
          .attr('ry', 5)
          .attr('height', 20);
      });

  d3.selectAll('line').lower();
  d3.selectAll('text').raise();

  simulation.nodes(vertices);
  simulation.force('link')
    .links(edges)
    .distance(100)
    .strength(0.2);
}

function tick() {
  lines
      .attr('x1', function(d) {return d.source.x;})
      .attr('y1', function(d) {return d.source.y;})
      .attr('x2', function(d) {return d.target.x;})
      .attr('y2', function(d) {return d.target.y;});

  buildings.attr('transform', function(d) {
    return 'translate(' + d.x + ',' + d.y + ')';
  });
}

function newVertexAtMouse() {
  var x = d3.mouse(world.node())[0];
  var y = d3.mouse(world.node())[1];
  newVertex(x, y);
}

function newVertex(x = 0, y = 0) {
  var lastVertexId = 0;

  vertices.forEach(function(vertex){
    if (vertex.id > lastVertexId) {
      lastVertexId = vertex.id;
    }
  });
  
  var vertex = {id: ++lastVertexId, title: 'New', type: '', x: x, y: y};

  vertices.push(vertex);
  selectObj(vertex);
  inspector.focus();

  update();
  simulation.alpha(0.3).restart();
  return vertex;
}

function deleteObj(obj) {
  if (vertices.indexOf(obj) !== -1) {
    vertices.splice(vertices.indexOf(obj), 1);

    edges = edges.filter(function (edge) {
      return (edge.source !== obj && edge.target !== obj);
    });
  }

  if (edges.indexOf(obj) !== -1) {
    edges.splice(edges.indexOf(obj), 1);
  }

  update();
  simulation.alpha(0.3).restart();
}

function bldgDragStart(d) {
  source = d;

  if (!ctrlPressed) {
    dragging = true; // dragging the bldg
  } else {
    dragging = false; // drawing new edge
  }
}

function bldgDragProgress(d) {
  var tx, ty;
  if (dragging) {
    source.fx = d3.event.x;
    source.fy = d3.event.y;
  } else {
    if (target) {
      tx = target.x;
      ty = target.y;
    } else {
      tx = d3.mouse(world.node())[0];
      ty = d3.mouse(world.node())[1];
    }
    linePreview
        .style('display', 'inline')
        .attr('x1', function(d) {return source.x;})
        .attr('y1', function(d) {return source.y;})
        .attr('x2', function(d) {return tx;})
        .attr('y2', function(d) {return ty;});
  }

  simulation.alpha(0.3).restart();
}

function bldgDragEnd(d) {
  linePreview
      .style('display', 'none');

  if (dragging) {
    if (!d.fixed) {
      source.fx = null;
      source.fy = null;
    }
  } else {
    if (target) {
      if (source !== target && !edgeExists(source, target)) {
        // change this, allow connections in either direction
        edges.push({source: source, target: target});
        updateInspector(selected);
      }
    }
  }

  update();
}

function bldgHover(d) {
  target = d;
  d3.select(this).classed('hover', true);
}

function bldgUnHover(d) {
  target = null;
  d3.select(this).classed('hover', false);
}

function lineHover(d) {
  line = d;
}

function lineUnHover(d) {
  line = null;
}

function selectObj(subject) {
  if (d3.event) {
    d3.event.stopPropagation();
  }
  
  if (subject === selected) {
    // TODO: re-implement for multi-select
    //       do not interfere with dblclick
//    subject = null;
  }

  selected = subject;

  edges.forEach(function(edge) {
    edge.selected = false;
  });

  vertices.forEach(function(vertex) {
    vertex.selected = false;
  });

  updateInspector(selected);

  update();
}

function updateInspector(subject) {
  inspector.title.node().value = '';
  inspector.type.node().value = '';
  inspector.to.node().innerText = '';
  inspector.from.node().innerText = '';
  
  if (subject && subject.title !== '') {
    subject.selected = true;

    inspector.title.node().value = subject.title;
    inspector.type.node().value = subject.type;

    var from = inspector.from
        .append('ul');

    edges.forEach(function(edge) {
      if (edge.target === subject) {
        let li = from.append('li');
        li.append('a')
            .text(edge.source.title)
            .on('click', function() {
              selectObj(edge.source);
            });
        li.append('a')
            .text('×')
            .on('click', function() {
              deleteObj(edge);
              updateInspector(subject);
            });;
      }
    });

    from.append('li')
        .text('+')
        .on('click', function() {
          var vertex = newVertex();
          edges.push({source: vertex, target: subject});
          updateInspector(vertex);
          update();
        }); 

    var to = inspector.to
        .append('ul');

    edges.forEach(function(edge) {
      if (edge.source === subject) {
        let li = to.append('li');
        li.append('a')
            .text(edge.target.title)
            .on('click', function() {
              selectObj(edge.target);
            });
        li.append('a')
            .text('×')
            .on('click', function() {
              deleteObj(edge);
              updateInspector(subject);
            });
      }
    });

    to.append('li')
        .text('+')
        .on('click', function() {
          var vertex = newVertex();
          edges.push({source: subject, target: vertex});
          updateInspector(vertex);
          update();
        }); 

  } else {
    if (subject && subject.title === '') {
      deleteObj(subject);
    }
  }
}

function fixBldg(subject) {
  if (subject && subject.fixed) {
    d3.select(this).classed('fixed', false);
    subject.fixed = false;
    subject.fx = null;
    subject.fy = null;
    simulation.alpha(0.3).restart();
  } else if (subject) {
    d3.select(this).classed('fixed', true);
    subject.fixed = true;
    subject.fx = subject.x;
    subject.fy = subject.y;
  }
}

function edgeExists(source, target) {
  for (var i = 0; i < edges.length; i++) {
    if ((source === edges[i].source && target === edges[i].target) ||
        (source === edges[i].target && target === edges[i].source)) {
      return true;
    }
  }
}

function exportGraph() {
  var cleanEdges = edges.map(function(edge) {
    var cleanEdge = Object.assign({}, edge);
    cleanEdge.source = cleanEdge.source.id;
    cleanEdge.target = cleanEdge.target.id;
    return cleanEdge;
  });

  var cleanGraph = {vertices: vertices, edges: cleanEdges};
  return JSON.stringify(cleanGraph);
}

function importGraph(dirtyGraph) {
  // TODO: check for duplicate IDs
  var graph = JSON.parse(dirtyGraph);

  vertices = [];
  edges = [];

  vertices = graph.vertices;
  edges = graph.edges;
  update();
  simulation.alpha(1).restart();
}

function windowKeydown(d) {
  if (d3.event.target.type !== "text") {
    switch(d3.event.keyCode) {
      case 16: // shift
      case 17: // ctrl
      case 18: // alt
      case 91: // cmd
        ctrlPressed = true;
        svg.attr('style', 'cursor: pointer');
        break;
      case 8:  // backspace
      case 46: // delete
      case 68: // d
        d3.event.preventDefault();
        world.selectAll('.selected').each(deleteObj);
        target = null;
        break;
       case 80: // p
        world.selectAll('.selected').each(fixBldg);
        break;
      case 27: // esc
        selectObj(null);
        break;
      default:
        break;
    }
  }
}

function windowKeyup() {
  switch(d3.event.keyCode) {
    case 16: // shift
    case 17: // ctrl
    case 18: // alt
    case 91: // cmd
      ctrlPressed = false;
      svg.attr('style', 'cursor: default');
      break;
    default:
      break;
  }
}

function resize() {
  var windowWidth = window.innerWidth,
      windowHeight = window.innerHeight;

  width  = windowWidth - 258,
  height = windowHeight - 10;

  svg
    .attr('width', width)
    .attr('height', height);

  simulation
      .alpha(0.3).restart();
}

function zoomed() {
  world.attr('transform', d3.event.transform);
}
