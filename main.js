{ // INIT
  var width  = 960,
      height = 500;

  var svg = d3.select('body').append('svg')
      .attr('width', width)
      .attr('height', height);

  var buildings = svg.selectAll('g');
  var lines     = svg.selectAll('line');

  var linePreview = svg
     .append('line');

  var lastVertexId = 2;
  var vertices = [
    {id: 'Stone', type: 'stockpile'},
    {id: 'Mason', type: 'workshop'},
    {id: 'Crafts', type: 'workshop'}
  ];
  var edges = [
    {source: 'Stone', target: 'Mason'},
    {source: 'Stone', target: 'Crafts'}
  ];

  var source = null,
      target = null,
      line   = null; // rename this (represents an edge)

  var dragging = true;
  var ctrlPressed = false;

  svg.on('dblclick', newVertexAtMouse);

  d3.select(window)
    .on('keydown', windowKeydown)
    .on('keyup', windowKeyup);

  var simulation = d3.forceSimulation()
      .force('x', d3.forceX(width/2))
      .force('y', d3.forceY(height/2))
      .force('link', d3.forceLink().id(function(d) {return d.id;}))
      .force('charge', d3.forceManyBody().strength(-200))
      .on('tick', tick);

  simulation.force('x').strength(0.05);
  simulation.force('y').strength(0.10);

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

  buildings = buildings.data(vertices, function(d) {return d.id});
  buildings.exit().remove();
  var enter = buildings.enter().append('g')
      .on('click', selectObj)
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

  buildings.classed('selected', function (d) {return d.selected});
  lines.classed('selected', function (d) {return d.selected});

  buildings.selectAll('text')
      .text(function(d) {return d.id;})
      .attr('transform', function() {
         var b = this.getBBox();
         return 'translate(-'+ b.width/2 +','+ b.height/2 +')';
        });
  buildings.selectAll('rect')
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('width', 50)
      .attr('height', 50)
      .attr('transform', 'translate(-25,-25)');

/*
      .attr('width', function(d) {
        return this.previousElementSibling.getBBox().width + 5;
      })
      .attr('height', function(d) {
        return this.previousElementSibling.getBBox().height + 5;
      })
      .attr('transform', function() {
       var b = this.previousElementSibling.getBBox();
       return 'translate(-'+ b.width/2 +',-'+ b.height/2 +')';
      });
*/

  d3.selectAll('line').lower();
  d3.selectAll('text').raise();

  simulation.nodes(vertices);
  simulation.force('link').links(edges).distance(150).strength(0.1)
  simulation.alpha(0.3).restart();

}

function tick() {
  lines
      .attr('x1', function(d) {return d.source.x})
      .attr('y1', function(d) {return d.source.y})
      .attr('x2', function(d) {return d.target.x})
      .attr('y2', function(d) {return d.target.y});

  buildings.attr('transform', function(d) {
    return 'translate(' + d.x + ',' + d.y + ')';
  });
}

// if control-clicking, should start a control-drag event...
function newVertexAtMouse() {
  var x = d3.mouse(this)[0];
  var y = d3.mouse(this)[1];

  vertices.push({id: ++lastVertexId, x: x, y: y});

  update();
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
  if (dragging) {
    source.fx = d3.event.x;
    source.fy = d3.event.y;
  } else {
    if (target) {
      tx = target.x;
      ty = target.y;
    } else {
      tx = d3.mouse(svg.node())[0];
      ty = d3.mouse(svg.node())[1];
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

function bldgHover(d) {
  target = d;
}

function bldgUnHover(d) {
  target = null;
}

function lineHover(d) {
  line = d;
}

function lineUnHover(d) {
  line = null;
}

function selectObj(subject) {
  if (subject.selected) {
    subject.selected = false;
  } else {
    subject.selected = true;
  }
  update();
}

function edgeExists(source, target) {
  for (var i = 0; i < edges.length; i++) {
    if ((source === edges[i].source && target === edges[i].target) ||
        (source === edges[i].target && target === edges[i].source)) {
      return true;
    }
  }
}
var x;
function editLabel(d) {
  if (d) {
    var label = prompt('Building type:')
    if (label) {
      d.id = label;
      update();
    }
  }
}

function windowKeydown() {
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
      svg.selectAll('.selected').each(deleteObj);
      target = null;
      break;
    case 69: // e
      editLabel(target);
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
      ctrlPressed = false;
      svg.attr('style', 'cursor: default');
      break;
    default:
      break;
  }
}
