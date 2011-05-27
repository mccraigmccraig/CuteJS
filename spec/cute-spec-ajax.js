describe("Tense", function() {
  it("should cancel waiting ajax'es", function() {
    var tense = cute.Tense();
    var self = this;
    self.result = {};
    runs(function() {
      tense.ajax(
              {
                url: '../fixtures/first_json_fixture.json?killcache=' + (new Date().getTime())
              },
              function(data, status) {
                self.result.first_result = {data: data, status: status};
              }
              );
      tense.ajax(
              {
                url: '../fixtures/second_json_fixture.json?killcache=' + (new Date().getTime())
              },
              function(data, status) {
                self.result.second_result = {data: data, status: status};
              }
              );      
      tense.ajax(
              {
                url: '../fixtures/third_json_fixture.json?killcache=' + (new Date().getTime())
              },
              function(data, status) {
                self.result.third_result = {data: data, status: status};
              }
              );
    });

    waits(250);

    runs(function () {
      expect(this.result.first_result.data.name).toEqual('first');
      expect(this.result.second_result).toEqual({ data : undefined, status : 'interrupted' });
      expect(this.result.third_result.data.name).toEqual('third');

    });
  });

  it("should cancel waiting json'es", function() {
    var tense = cute.Tense();
    var self = this;
    self.result = {};
    runs(function() {
      tense.json('../fixtures/first_json_fixture.json?killcache=' + (new Date().getTime()),
              function(data, status) {
                self.result.first_result = {data: data, status: status};
              }
              );
      tense.json('../fixtures/second_json_fixture.json?killcache=' + (new Date().getTime()),
              function(data, status) {
                self.result.second_result = {data: data, status: status};
              }
              );
      tense.json('../fixtures/third_json_fixture.json?killcache=' + (new Date().getTime()),
              function(data, status) {
                self.result.third_result = {data: data, status: status};
              }
              );
    });

    waits(250);

    runs(function () {
      expect(this.result.first_result.data.name).toEqual('first');
      expect(this.result.second_result).toEqual({ data : undefined, status : 'interrupted' });
      expect(this.result.third_result.data.name).toEqual('third');
    });
  });
});


describe("Cute", function() {

  it("should chain ajax calls and pass on the results", function() {
    var serial = new cute.Serial();

    runs(function() {
      var self = this;
      serial
              .ajax(
      {
        url: '../fixtures/json_fixture.js&killcache=' + (new Date().getTime()),
        timeout: 1
      }
              )
              .ajax(
      {
        url: '../fixtures/json_fixture.js?second=y&killcache=' + (new Date().getTime()),
        timeout: 2
      },
              function(data, previous) {
                self.result = {data:data, previous: previous};
              }
              )

    });

    waits(100);

    runs(function () {
      expect(this.result.data.textStatus).toEqual('timeout');
      expect(this.result.previous.textStatus).toEqual('timeout');
    });

  });

  it("should chain ajax calls and pass on the results", function() {
    var serial = new cute.Serial();

    runs(function() {
      var self = this;
      serial
              .ajax(
      {
        url: '../fixtures/first_json_fixture.json?killcache=' + (new Date().getTime()),
        timeout: 100
      }
              )
              .ajax(
      {
        url: '../fixtures/second_json_fixture.json?killcache=' + (new Date().getTime()),
        timeout: 200
      },
              function(data, previous) {
                self.result = {data:data, previous: previous};
              }
              )

    });

    waits(100);

    runs(function () {
      expect(this.result.data.name).toEqual('second');
      expect(this.result.previous.name).toEqual('first');
    });

  });

  it("should chain json calls and pass on the results", function() {
    var serial = new cute.Serial();

    runs(function() {
      var self = this;
      serial
              .json(
      {
        url: '../fixtures/first_json_fixture.json?killcache=' + (new Date().getTime()),
        timeout: 100
      }
              )
              .json(
      {
        url: '../fixtures/second_json_fixture.json?killcache=' + (new Date().getTime()),
        timeout: 200
      },
              function(data, previous) {
                self.result = {data:data, previous: previous};
              }
              )

    });

    waits(100);

    runs(function () {
      expect(this.result.data.name).toEqual('second');
      expect(this.result.previous.name).toEqual('first');
    });

  });
});
