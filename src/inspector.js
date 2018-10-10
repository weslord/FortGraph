function Inspector () {
  var self = this;
  this.selected = {};
  this.body = d3.select('body').append('div')
      .attr('id', 'inspector');
  this.title = this.body.append('input')
      .on('change', function () {
        if (this.value == '') {
          this.value = self.selected.title;
        } else {
          self.selected ? self.selected.title = this.value : null;
          //self.select(self.selected); // no edges defined
          //update(); // external function
        }
      });
  this.type = this.body.append('input')
      .on('change', function () {
        self.selected ? self.selected.type = this.value : null;
        //update(); //external function
      });
  this.from = this.body.append('div').classed('from', true);
  this.to = this.body.append('div').classed('to', true);
}

Inspector.prototype.focus = function () {
  d3.event.stopPropagation();
  this.title.node().select();
};

Inspector.prototype.select = function (subject, edges) {
  this.selected = subject;

  this.title.node().value = '';
  this.type.node().value = '';
  this.to.node().innerText = '';
  this.from.node().innerText = '';

  if (subject && subject.title !== '') {
    subject.selected = true;

    this.title.node().value = subject.title;
    this.type.node().value = subject.type;

    var from = this.from
        .append('ul');


    //embed in subject: subject.targets
    edges.forEach(function(edge) {
      if (edge.target === subject) {
        let li = from.append('li');
        li.append('a')
            .text(edge.source.title)
            .on('click', function() {
              // external function
              selectObj(edge.source);
            });
        li.append('a')
            .text('×')
            .on('click', function() {
              // external function
              deleteObj(edge);
              this.select(subject);
            });
      }
    });

    from.append('li')
        .text('+')
        .on('click', function() {
          var vertex = newVertex();
          edges.push({source: vertex, target: subject});
          this.select(vertex);
          //update();
        });

    var to = this.to
        .append('ul');


    //embed in subject: subject.sources
    edges.forEach(function(edge) {
      if (edge.source === subject) {
        let li = to.append('li');
        li.append('a')
            .text(edge.target.title)
            .on('click', function() {
              // external function
              selectObj(edge.target);
            });
        li.append('a')
            .text('×')
            .on('click', function() {
              // external function
              deleteObj(edge);
              this.select(subject);
            });
      }
    });

    to.append('li')
        .text('+')
        .on('click', function() {
          var vertex = newVertex();
          edges.push({source: subject, target: vertex});
          this.select(vertex);
          //update();
        });

  } else {
    if (subject && subject.title === '') {
      // external function
      deleteObj(subject);
    }
  }
}

export { Inspector };
