import { Forces } from './forces.js';
import { Inspector } from './inspector.js';

// Globals
var svg;
var world;
var inspector;
var linePreview;

var color;
var forces;

var buildings;
var lines;
var edges;
var vertices;

var source = null,
    target = null,
    selected = null,
    line   = null; // rename this (represents an edge)

var dragging = true;
var ctrlPressed = false;

{
  const windowWidth  = window.innerWidth,
        windowHeight = window.innerHeight;

  const width  = windowWidth - 258,
        height = windowHeight - 10;

  color = d3.scaleOrdinal(d3.schemeCategory10);

  svg = d3.select('body').append('svg')
      .attr('width', width)
      .attr('height', height);

  world = svg.append('g')
      .attr('id', 'world')
      .attr('transform', 'translate('+width/2+','+height/2+')');

  svg
    .call(d3.zoom()
        .scaleExtent([1/8, 2])
        .on('zoom', zoomed))
    .call(d3.zoom().transform, d3.zoomIdentity.translate(width/2, height/2))
    .on('dblclick.zoom', null);

  // from http://bl.ocks.org/rkirsling/5001347
  // define arrow markers for graph links
  svg.append('svg:defs').append('svg:marker')
    .attr('id', 'end-arrow')
    .attr('viewBox', '0 -5 15 10')
    .attr('refX', 7.5)
    .attr('markerWidth', 7.5)
    .attr('markerHeight', 5)
    .attr('orient', 'auto')
  .append('svg:path')
    .attr('d', 'M 0 -5 L 10 0 L 0 5')
    .attr('style', 'fill: #000; stroke: none');

  buildings = world.selectAll('g');
  lines     = world.selectAll('g');

  linePreview = world
      .append('path');

  inspector = new Inspector();

  vertices = [];
  edges = [];

  d3.text('src/industries.json').then(function(g){
    importGraph(g);
  });

  
  window.addEventListener("resize", resize);

  svg.on('dblclick', newVertexAtMouse);
  svg.on('click', selectObj);

  d3.select(window)
    .on('keydown', windowKeydown)
    .on('keyup', windowKeyup);

  forces = new Forces(tick);

  update();
}

function update() {
  lines = lines.data(edges, function(d) {
    return d.index;
  });
  lines.exit().remove();
  let enter = lines.enter().append('g')
      .on('click', selectObj)
      .on('mouseover', lineHover)
      .on('mouseout', lineUnHover);
  enter.append('path')
      .style('marker-end', 'url(#end-arrow)');
  lines = lines.merge(enter);

  buildings = buildings.data(vertices, function(d) {
    return d.id;
  });
  buildings.exit().remove();
  enter = buildings.enter().append('g')
      .on('click', selectObj)
      .on('dblclick', inspector.focus.bind(inspector))
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
         const b = this.getBBox();
         return 'translate(-'+ b.width/2 +','+ 10/2 +')';
        });
  buildings.selectAll('rect')
      .each(function(d) {
        const b = this.parentNode.querySelector('text').getBBox();
        d.width = b.width + 5;
        d.height = 20;
        d3.select(this)
          .attr('width', d.width)
          .attr('height', d.height)
          .attr('transform', 'translate(-'+ d.width / 2 +','+ -10 +')')
          .attr('stroke', color(d.type))
          .attr('rx', 5)
          .attr('ry', 5);
      });

  lines.lower();
  d3.selectAll('text').raise();

  forces.update(vertices, edges);
}

function tick() {
  lines.each(drawPath);

  buildings.attr('transform', function(d) {
    return 'translate(' + d.x + ',' + d.y + ')';
  });
}

function drawPath(d) {
  let path;
  if (this.children) {
    path = this.children[0];
  } else {
    path = this.node();
  }

  const x1 = d.source.x;
  const y1 = d.source.y;
  const y2 = d.target.y;
  const x2 = d.target.x;
  const w2 = d.target.width/2 + 3;
  const h2 = d.target.height/2 + 3;

  const dx = x1 - x2;
  const dy = y1 - y2;
  const m12 = dy / dx;
  const m2 = h2 / w2;

  let x2a;
  let y2a;

  if ( Math.abs(m12) > Math.abs(m2) ) {
    // if slope of line is greater than aspect ratio of box
    // line exits out the bottom
    x2a = x2 + dy/Math.abs(dy) * h2 / m12;
    y2a = y2 + dy/Math.abs(dy) * h2;
  } else {
    // line exits out the side
    x2a = x2 + dx/Math.abs(dx) * w2;
    y2a = y2 + dx/Math.abs(dx) * w2 * m12;
  }

  d3.select(path)
    .attr('d', `
      M ${x1} ${y1}
      L ${x2a} ${y2a}
    `); 
}

function newVertexAtMouse() {
  const x = d3.mouse(world.node())[0];
  const y = d3.mouse(world.node())[1];
  newVertex(x, y);
}

function newVertex(x = 0, y = 0) {
  let lastVertexId = 0;

  vertices.forEach(function(vertex){
    if (vertex.id > lastVertexId) {
      lastVertexId = vertex.id;
    }
  });
  
  const vertex = {id: ++lastVertexId, title: 'New', type: '', x: x, y: y};

  vertices.push(vertex);
  selectObj(vertex);
  inspector.focus();

  update();
  forces.restart(0.3);
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
  forces.restart(0.3);
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
  let tx, ty;
  if (dragging) {
    source.fx = d3.event.x;
    source.fy = d3.event.y;
  } else {
    if (target && target !== source) {
      drawPath.call(linePreview, {source, target});
    } else {
      tx = d3.mouse(world.node())[0];
      ty = d3.mouse(world.node())[1];
      linePreview
          .style('display', 'inline')
          .style('marker-end', 'url(#end-arrow)')
          .attr('d', function(d) {
            return `M ${source.x} ${source.y} L ${tx} ${ty}`
          });
    }
  }

  forces.restart(0.3);
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
        edges.push({source: source, target: target});
        inspector.select(selected, edges);
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

  inspector.select(selected, edges);

  update();
}

function fixBldg(subject) {
  if (subject && subject.fixed) {
    d3.select(this).classed('fixed', false);
    subject.fixed = false;
    subject.fx = null;
    subject.fy = null;
    forces.restart(0.3);
  } else if (subject) {
    d3.select(this).classed('fixed', true);
    subject.fixed = true;
    subject.fx = subject.x;
    subject.fy = subject.y;
  }
}

function edgeExists(source, target) {
  for (let i = 0; i < edges.length; i++) {
    if (source === edges[i].source && target === edges[i].target) {
      return true;
    }
  }
}

function exportGraph() {
  const cleanEdges = edges.map(function(edge) {
    let cleanEdge = Object.assign({}, edge);
    cleanEdge.source = cleanEdge.source.id;
    cleanEdge.target = cleanEdge.target.id;
    return cleanEdge;
  });

  const cleanGraph = {vertices: vertices, edges: cleanEdges};
  return JSON.stringify(cleanGraph);
}

function importGraph(dirtyGraph) {
  // TODO: check for duplicate IDs
  const graph = JSON.parse(dirtyGraph);

  vertices = [];
  edges = [];

  vertices = graph.vertices;
  edges = graph.edges;
  update();
  forces.restart(1);
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
  const windowWidth = window.innerWidth,
        windowHeight = window.innerHeight;

  const width  = windowWidth - 258,
        height = windowHeight - 10;

  svg
    .attr('width', width)
    .attr('height', height);

  forces.restart(0.3);
}

function zoomed() {
  world.attr('transform', d3.event.transform);
}
