import { graph, newVertex, deleteObj, selectObj, edges } from './main.js';

function Inspector () {
  const self = this;
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
          // external function
          graph.update();
        }
      });
  this.type = this.body.append('input')
      .on('change', function () {
        self.selected ? self.selected.type = this.value : null;
        // external function
        graph.update();
      });
  this.from = this.body.append('div').classed('from', true);
  this.to = this.body.append('div').classed('to', true);
}

Inspector.prototype.focus = function () {
  d3.event.stopPropagation();
  this.title.node().select();
};

Inspector.prototype.select = function (subject) {
  this.selected = subject;

  this.title.node().value = '';
  this.type.node().value = '';
  this.to.node().innerText = '';
  this.from.node().innerText = '';

  if (subject && subject.title !== '') {
    subject.selected = true;

    this.title.node().value = subject.title;
    this.type.node().value = subject.type;

    const from = this.from
        .append('ul');


    //embed in subject: subject.targets
    edges.forEach( (edge) => {
      if (edge.target === subject) {
        const li = from.append('li');
        li.append('a')
            .text(edge.source.title)
            .on('click', () => {
              // external function
              selectObj(edge.source);
            });
        li.append('a')
            .text('×')
            .on('click', () => {
              // external function
              deleteObj(edge);
              this.select(subject);
            });
      }
    });

    from.append('li')
        .text('+')
        .on('click', () => {
          const vertex = newVertex();
          edges.push({source: vertex, target: subject});
          this.select(vertex);
          // external function
          graph.update();
        });

    const to = this.to
        .append('ul');


    //embed in subject: subject.sources
    edges.forEach( (edge) => {
      if (edge.source === subject) {
        const li = to.append('li');
        li.append('a')
            .text(edge.target.title)
            .on('click', () => {
              // external function
              selectObj(edge.target);
            });
        li.append('a')
            .text('×')
            .on('click', () => {
              // external function
              deleteObj(edge);
              this.select(subject);
            });
      }
    });

    to.append('li')
        .text('+')
        .on('click', () => {
          const vertex = newVertex();
          edges.push({source: subject, target: vertex});
          this.select(vertex);
          // external function
          graph.update();
        });

  } else {
    if (subject && subject.title === '') {
      // external function
      deleteObj(subject);
    }
  }
}

export { Inspector };
