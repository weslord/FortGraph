{ // INIT
  var width  = 800,
      height = 500;

  var color = d3.scaleOrdinal(d3.schemeCategory10);

  var svg = d3.select('body').append('svg')
      .attr('width', width)
      .attr('height', height);

  var buildings = svg.selectAll('g');
  var lines     = svg.selectAll('line');

  var linePreview = svg
     .append('line');

  var inspector = d3.select('body').append('div')
      .attr('id', 'inspector');
  var titleInput = inspector.append('input')
      .on('change', function () {
        selected ? selected.title = this.value : null;
        update();
      })
      .node();
  var typeInput = inspector.append('input')
      .on('change', function () {
        selected ? selected.type = this.value : null
        update();
      })
      .node();
  var connections = inspector.append('div')
      .node();

  var lastVertexId = 2;
  var vertices = [
    {id: 0, title: 'Stone', type: 'stockpile'},
    {id: 1, title: 'Mason', type: 'workshop'},
    {id: 2, title: 'Crafts', type: 'workshop'}
  ];
  var edges = [
    {source: '0', target: '1'},
    {source: '0', target: '2'}
  ];

  var source = null,
      target = null,
      selected = null,
      line   = null; // rename this (represents an edge)

  var dragging = true;
  var ctrlPressed = false;

  svg.on('dblclick', newVertexAtMouse);
  svg.on('click', selectObj);

  d3.select(window)
    .on('keydown', windowKeydown)
    .on('keyup', windowKeyup);

  var simulation = d3.forceSimulation()
      .force('x', d3.forceX(width/2))
      .force('y', d3.forceY(height/2))
      .force('link', d3.forceLink().id(function(d) {return d.id;}))
      .force('charge', d3.forceManyBody().strength(-200))
      .on('tick', tick);

  simulation.force('x').strength(0.04);
  simulation.force('y').strength(0.08);

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
      .on('dblclick', fixBldg)
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
  simulation.force('link').links(edges).distance(100).strength(0.2)
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

function newVertexAtMouse() {
  var x = d3.mouse(this)[0];
  var y = d3.mouse(this)[1];

  var newVertex = {id: ++lastVertexId, title: 'New', type: '', x: x, y: y};

  vertices.push(newVertex);
  selectObj(newVertex);

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
    if (!d.fixed) {
      source.fx = null;
      source.fy = null;
    }
  } else {
    if (target) {
      if (source !== target && !edgeExists(source, target)) {
        edges.push({source: source, target: target});
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
    d3.event.stopPropagation();
    if (subject === selected) {
      subject = null;
    }

    selected = subject;

    edges.forEach(function(edge) {
      edge.selected = false;
    });

    vertices.forEach(function(vertex) {
      vertex.selected = false;
    });

  if (subject) {
    subject.selected = true;

    titleInput.value = subject.title;
    typeInput.value = subject.type;

    var conString = '';
    edges.forEach(function(edge) {
      if (edge.source === subject || edge.target === subject) {
        conString += ''+ edge.source.title +' - '+ edge.target.title +'<br>';
      }
    });

    connections.innerHTML = conString;
  } else {
    titleInput.value = '';
    typeInput.value = '';
    connections.innerText = '';
  }

  update();
}

function fixBldg(subject) {
  d3.event.stopPropagation();
  if (subject && subject.fixed) {
    subject.fixed = false;
    subject.fx = null;
    subject.fy = null;
  } else if (subject) {
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
  })

  var cleanGraph = {vertices: vertices, edges: cleanEdges};
  return JSON.stringify(cleanGraph);
}

function importGraph(dirtyGraph) {
  // TODO: check for duplicate IDs
  var graph = JSON.parse(dirtyGraph);

  vertices = [];
  edges = [];
  update();

  vertices = graph.vertices;
  edges = graph.edges;
  update();
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
        svg.selectAll('.selected').each(deleteObj);
        target = null;
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
