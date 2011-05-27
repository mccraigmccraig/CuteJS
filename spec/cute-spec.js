describe("Eager", function() {
  it("should schedule single actions", function() {
    var eager = cute.Eager();
    var self = this;
    runs(function() {
      eager.exec(
              function(complete_callback) {
                setTimeout(function() {
                  complete_callback('first')
                }, 40);
              })
              .end(
              function(data) {
                self.result = data;
              }
              );
    });

    waits(100);

    runs(function () {
      expect(this.result).toEqual('first');
    });
  });

  it("should execute actions in parallel, not sterilizing them but call the final callback when all asynchronous results are available", function() {
    var eager = cute.Eager();
    var self = this;
    self.result = undefined;
    runs(function() {
      eager.exec(
              function(complete_callback) {
                setTimeout(function() {
                  complete_callback('first')
                }, 400); // execute after 400 ms
              }
              );
      eager.exec(
              function(complete_callback) {
                setTimeout(function() {
                  complete_callback('second')
                }, 400); // execute after 400 ms
              }
              );
      eager.exec(
              function(complete_callback) {
                setTimeout(function() {
                  complete_callback('third')
                }, 400); // execute after 400 ms
              }
              );

      eager.end(
              function(data1, data2, data3) {
                self.result = [data1, data2, data3];
              }
              );
    });

    waits(500); // wait 500 ms
    // serialized execution would take more than 1200ms
    // but we are running functions in 'concurrently'

    runs(function () {
      expect(this.result).toEqual(['first', 'second', 'third']);
    });
  });


});

describe("Tense", function() {
  it("should schedule single actions", function() {
    var tense = cute.Tense();
    var self = this;
    runs(function() {
      tense.exec(
              function(complete_callback) {
                setTimeout(function() {
                  complete_callback('first')
                }, 40);
              },
              function(data, status) {
                self.result = [data, status];
              }
              );
    });

    waits(100);

    runs(function () {
      expect(this.result).toEqual(['first', 'completed']);
    });
  });

  it("should cancel waiting actions", function() {
    var tense = cute.Tense();
    var self = this;
    self.result = {};
    runs(function() {
      tense.exec(
              function(complete_callback) {
                setTimeout(function() {
                  self.result.first_finished = true;
                  complete_callback('first')
                }, 400);
              },
              function(data, status) {
                self.result.first_result = [data, status];
              }
              );
      tense.exec(
              function(complete_callback) {
                setTimeout(function() {
                  self.result.second_finished = true;
                  complete_callback('second')
                }, 10);
              },
              function(data, status) {
                self.result.second_result = [data, status];
              }
              );
      tense.exec(
              function(complete_callback) {
                setTimeout(function() {
                  self.result.third_finished = true;
                  complete_callback('third')
                }, 100);
              },
              function(data, status) {
                self.result.third_result = [data, status];
              }
              );
    });

    waits(1000);

    runs(function () {
      expect(this.result.first_result).toEqual(['first', 'completed']);
      expect(this.result.second_result).toEqual([undefined, 'interrupted']);
      expect(this.result.third_result).toEqual(['third', 'completed']);

      expect(this.result.first_finished).toEqual(true);
      expect(this.result.second_finished).toEqual(undefined);
      expect(this.result.third_finished).toEqual(true);

    });
  });

});


describe("Serial", function() {

  it("should chain functions and pass on the results", function() {
    var serial = new cute.Serial();

    runs(function() {
      var self = this;
      serial.exec(
              function(complete_callback) {
                setTimeout(function() {
                  complete_callback('first')
                }, 40);
              },
              undefined,
              '1'
              )
              .exec(
              function(complete_callback) {
                setTimeout(function() {
                  complete_callback('second')
                }, 2);
              },
              undefined,
              '2'
              )
              .exec(
              function(complete_callback) {
                setTimeout(function() {
                  complete_callback('third')
                }, 15);
              },
              function(data, previous) {
                self.result = [data, previous];
              },
              '3'
              )

    });

    waits(200);

    runs(function () {
      expect(this.result).toEqual(['third', 'second']);
    });

  });

  it("should chain functions and accumulate results", function() {
    var serial = new cute.Serial();

    runs(function() {
      var self = this;
      serial.exec(
              function(complete_callback) {
                setTimeout(function() {
                  complete_callback('first')
                }, 40);
              },
              function(data, previous) {
                //self.result = [data, previous];
                return [data, previous];
              },
              '1'
              )
              .exec(
              function(complete_callback) {
                setTimeout(function() {
                  complete_callback('second')
                }, 2);
              },
              function(data, previous) {
                return [data, previous];
              },
              '2'
              )
              .exec(
              function(complete_callback) {
                setTimeout(function() {
                  complete_callback('third')
                }, 15);
              },
              function(data, previous) {
                self.result = [data, previous];
              },
              '3'
              )

    });

    waits(200);

    runs(function () {
      expect(this.result).toEqual(['third', ['second', ['first', undefined]]]);
    });

  });

});


describe("Lax", function() {
  it("should schedule single actions", function() {
    var lax = cute.Lax();
    var self = this;
    runs(function() {
      lax.exec(
              function(complete_callback) {
                setTimeout(function() {
                  complete_callback('first')
                }, 40);
              },
              function(data) {
                self.result = data;
              }
              );
    });

    waits(100);

    runs(function () {
      expect(this.result).toEqual('first');
    });
  });

  it("should cancel waiting actions", function() {
    var lax = cute.Lax();
    var self = this;
    self.result = {};
    runs(function() {
      lax.exec(
              function(complete_callback) {
                setTimeout(function() {
                  self.result.first_finished = true;
                  complete_callback('first')
                }, 400);
              },
              function(data) {
                self.result.first_result = data;
              }
              );
      lax.exec(
              function(complete_callback) {
                setTimeout(function() {
                  self.result.second_finished = true;
                  complete_callback('second')
                }, 10);
              },
              function(data) {
                self.result.second_result = data;
              }
              );
      lax.exec(
              function(complete_callback) {
                setTimeout(function() {
                  self.result.third_finished = true;
                  complete_callback('third')
                }, 100);
              },
              function(data) {
                self.result.third_result = data;
              }
              );
    });

    waits(1000);

    runs(function () {
      expect(this.result.first_result).toEqual(undefined);
      expect(this.result.second_result).toEqual(undefined);
      expect(this.result.third_result).toEqual('third');

      // it executes all tasks as new task do not interrupt the one being processed, but only
      // cancel the current task callback invocation.
      expect(this.result.first_finished).toEqual(true);
      expect(this.result.second_finished).toEqual(true);
      expect(this.result.third_finished).toEqual(true);

    });
  });

});
