const sleep = (wait) => new Promise((resolve) => setTimeout(resolve, wait || 100))

exports.sleep = sleep
