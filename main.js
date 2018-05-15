{ // INIT
  var width  = 960,
      height = 500;

  var svg = d3.select('body').append('svg')
      .attr('width', width)
      .attr('height', height);

  var circles = svg.selectAll('circle');
  var lines   = svg.selectAll('line');

  var linePreview = svg
     .append('line');

  var lastVertexId = 2;
  var vertices = [
    {id: 0, x: width * 0.2, y: height * 0.4},
    {id: 1, x: width * 0.5, y: height * 0.5},
    {id: 2, x: width * 0.8, y: height * 0.6}
  ];
  var edges = [{source: 0, target: 1}];

  var source = null,
      target = null,
      line   = null;

  var dragging = true;
  var ctrlPressed = false;
  var ctrlPresses = 0;

  svg.on('dblclick', newVertexAtMouse);

  d3.select(window)
    .on('keydown', windowKeydown)
    .on('keyup', windowKeyup);

  var simulation = d3.forceSimulation()
      .force('x', d3.forceX(width/2))
      .force('y', d3.forceY(height/2))
      .force('link', d3.forceLink().id(function(d) {return d.id;}))
      .force('charge', d3.forceManyBody().strength(-100))
      .on('tick', tick);

  update();
}

function update() {
  lines = lines.data(edges);
  var enter = lines.enter().append('line')
      .on('mouseover', lineHover)
      .on('mouseout', lineUnHover);
  lines.exit().remove();
  lines = lines.merge(enter);

  circles = circles.data(vertices, function(d) {return d.id});
  circles.exit().remove();
  var enter = circles.enter().append('circle')
      .on('mouseover', circleHover)
      .on('mouseout', circleUnHover)
      .call(d3.drag()
        .on('start', circleDragStart)
        .on('drag', circleDragProgress)
        .on('end', circleDragEnd)
      );
  circles = circles.merge(enter)
      .raise();

  simulation.nodes(vertices);
  simulation.force('link').links(edges).distance(50).strength(0.1)
  simulation.alpha(0.3).restart();

}

function tick() {
  lines
      .attr('x1', function(d) {return d.source.x})
      .attr('y1', function(d) {return d.source.y})
      .attr('x2', function(d) {return d.target.x})
      .attr('y2', function(d) {return d.target.y});

  circles
      .attr('cx', function (d) {return d.x})
      .attr('cy', function (d) {return d.y})
}

// if control-clicking, should start a control-drag event...
function newVertexAtMouse() {
  var x = d3.mouse(this)[0];
  var y = d3.mouse(this)[1];

  vertices.push({id: ++lastVertexId, x: x, y: y});

  update();
}

function deleteVertex(vertex) {
  if (vertex) {
    vertices.splice(vertices.indexOf(vertex), 1);

    edges = edges.filter(function (edge) {
      return (edge.source !== vertex && edge.target !== vertex);
    });

    update();
  }
}

function deleteEdge(edge) {
  if (edge) {
    edges.splice(edges.indexOf(edge), 1);

    update();
  }
}

function circleDragStart(d) {
  source = vertices[vertices.indexOf(d)];

  if (!ctrlPressed) {
    dragging = true; // dragging the circle
  } else {
    dragging = false; // drawing new edge
  }
}

function circleDragProgress(d) {
  if (dragging) {
    source.fx = d3.mouse(this)[0];
    source.fy = d3.mouse(this)[1];
  } else {
    if (target) {
      tx = target.x;
      ty = target.y;
    } else {
      tx = d3.mouse(this)[0];
      ty = d3.mouse(this)[1];
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

function circleDragEnd(d) {
  linePreview
      .style('display', 'none');

  if (dragging) {
    source.fx = null;
    source.fy = null;
  } else {
    if (target) {
      if (!edgeExists(source, target)) {
        edges.push({source: source, target: target});
      }
    }
  }

  update();
}

function circleHover(d) {
  target = d;
}

function circleUnHover(d) {
  target = null;
}

function lineHover(d) {
  line = d;
}

function lineUnHover(d) {
  line = null;
}

function edgeExists(source, target) {
  for (var i = 0; i < edges.length; i++) {
    if ((source === edges[i].source && target === edges[i].target) ||
        (source === edges[i].target && target === edges[i].source)) {
      return true;
    }
  }
}

function windowKeydown() {
  switch(d3.event.keyCode) {
    case 16: // shift
    case 17: // ctrl
    case 18: // alt
    case 91: // cmd
      ctrlPresses++;
      ctrlPressed = true;
      svg.attr('style', 'cursor: pointer');
      break;
    case 8:  // backspace
    case 46: // delete
    case 68: //d
      deleteVertex(target);
      deleteEdge(line);
      target = null;
      break;
    default:
      break;
  }
}

function windowKeyup() {
  switch(d3.event.keyCode) {
    case 16: // shift
    case 17: // ctrl
    case 18: // alt
    case 91: // cmd
      if (--ctrlPresses < 1) {
        ctrlPresses = 0;
        ctrlPressed = false;
        svg.attr('style', 'cursor: default');
      }
      break;
    default:
      break;
  }
}
