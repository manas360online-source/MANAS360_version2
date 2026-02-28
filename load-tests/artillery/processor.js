// Processor helpers for Artillery scenarios
// Exports functions referenced from cbt-socketio.yml

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genUuid() {
  // simple UUID-like string sufficient for testing
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

module.exports = {
  initPatient: function (userContext, events, done) {
    // assign a session id and role
    userContext.vars.role = 'patient';
    userContext.vars.sessionId = 'sess-' + (randomInt(1, userContext.vars.totalSessions || 100));
    userContext.vars.clientId = 'p-' + genUuid();
    return done();
  },

  initTherapist: function (userContext, events, done) {
    userContext.vars.role = 'therapist';
    userContext.vars.sessionId = 'sess-' + (randomInt(1, userContext.vars.totalSessions || 100));
    userContext.vars.clientId = 't-' + genUuid();
    return done();
  },

  makeAnswer: function (userContext, events, done) {
    // produce a message id and an answer payload
    userContext.vars.messageId = 'm-' + genUuid();
    userContext.vars.answer = 'option_' + randomInt(1, 4);
    return done();
  },

  smallSleep: function (userContext, events, done) {
    // helper to create a short randomized think time
    const ms = 200 + Math.floor(Math.random() * 800);
    setTimeout(done, ms);
  }
};
