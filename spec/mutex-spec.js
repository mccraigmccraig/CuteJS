describe("Mutex", function() {


  it("should execute functions chains which mutate mutual resource", function() {

    var resource = [0];

    var double_ref = function(ref){
      ref[0] = ref[0] * 2;
    };

    var not_thread_safe_function = function() {
      // value of mutual resource is set to 1
      resource[0] = 1;
      // double the valure of the resource -> resulting in resource == 2
      double_ref(resource);
      // add 10 to the resource -> resulting in resource == 12
      resource[0] = resource[0]+10;
    };


    runs(function () {
      not_thread_safe_function();
    });

    waits(500);

    runs(function () {
      expect(resource[0]).toEqual(12);
    });

  });

  it("should protect critical section", function() {
    var mutex = new cute.Mutex();

    var resource = [0];

    var double_ref = mutex.sync(function(ref){
      ref[0] = ref[0] * 2;
    });

    var thread_safe_function = mutex.sync(function() {
      // value of mutual resource is set to 1
      resource[0] = 1;
      // this function is synchronized on the same mutex as the 'thread_safe_function' function
      // so its asynchronous execution will wait for the release of the resource
      double_ref(resource);
      // add 10 to the resource -> resulting in resource == 11
      resource[0] = resource[0]+10;
    });
    // exit form the synchronized function releases the mutex so 'double_ref' obtains exclusivity on the resource and performs operations
    // it doubles the valure of the resource -> resulting in resource == 22


    runs(function () {
      thread_safe_function();
    });

    waits(500);

    runs(function () {
      expect(resource[0]).toEqual(22);
    });

  });

});
