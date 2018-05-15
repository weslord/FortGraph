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
  //var edges = [{source: 0, target: 1}];
  // (can return to id-based edges when link force activated)
  var edges = [{source: vertices[0], target: vertices[1]}];

  var source = null,
      target = null;

  var dragging = true;
  var ctrlPresses = 0;

  svg.on('dblclick', svgClick);

  d3.select(window)
    .on('keydown', windowKeydown)
    .on('keyup', windowKeyup);

  update();
}

function update() {
  lines = lines.data(edges);

  var enter = lines.enter().append('line');

  lines.exit().remove();

  lines = lines.merge(enter);


  circles = circles.data(vertices, function(d) {return d.id});

  circles.exit().remove();

  var enter = circles.enter().append('circle')
      .on('mouseover', circleHover)
      .on('mouseout', circleUnHover)
      .on('click', circleClick)
      .call(d3.drag()
        .on('start', circleDragStart)
        .on('drag', circleDragProgress)
        .on('end', circleDragEnd)
      );

  circles = circles.merge(enter)
      .raise();


  tick();
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

// rename these event response functions to what they functionally DO?
// eg: newVertex(), or deleteVertex()
function svgClick() {
  var x = d3.mouse(this)[0];
  var y = d3.mouse(this)[1];

  vertices.push({id: ++lastVertexId, x: x, y: y});

  update();
}

function circleClick(d) {
  vertices.splice(vertices.indexOf(d), 1);

  edges = edges.filter(function (edge) {
    return (edge.source !== d && edge.target !== d);
  });

  update();
}

function circleDragStart(d) {
  source = vertices[vertices.indexOf(d)];

  if (!ctrlPressed) {
    dragging = true; // dragging the circle
  } else {
    dragging = false; // drawing new edge
  }

  tick();
}
function circleDragProgress(d) {
  if (dragging) {
    source.x = d3.mouse(this)[0];
    source.y = d3.mouse(this)[1];
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

  tick();
}

function circleDragEnd(d) {
  linePreview
      .style('display', 'none');

  if (!dragging) {
    if (target) {
      if (!edgeExists(source, target)) {
        edges.push({source: source, target: target});
        update();
      }
    }
  }

  source = null;

  tick();
}

function circleHover(d) {
  target = d;
}

function circleUnHover(d) {
  target = null;
}

function edgeExists(source, target) {
  for (var i = 0; i < edges.length; i++) {
    if ((source === edges[i].source && target === edges[i].target) ||
        (source === edges[i].target && target === edges[i].source)) {
      console.log('dupe');
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
      circles.attr('style', 'fill: #eee');
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
        circles.attr('style', 'fill: #fff');
      }
      break;
    default:
      break;
  }
}
