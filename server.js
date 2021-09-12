// jshint esversion:8

"use strict";

const Hapi = require("@hapi/hapi");
const Path = require('path');
const cflapi = require("./lib/cflapi.js");
const cors = {
  origin: ["*"],
  headers: [
    "Access-Control-Allow-Origin",
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Methods",
    "Access-Control-Request-Headers",
    "Origin, X-Requested-With, Content-Type",
    "CORELATION_ID",
  ],
  additionalHeaders: ['cache-control', 'x-requested-with', 'X_AUTH_TOKEN'],
  credentials: true,
};
const socket = require('./lib/socket');
const _ = require('lodash');
const ls = require('./lib/livescoring');

function getAddress() {
  return new Promise((resolve, reject) => {
    require("dns").lookup(require("os").hostname(), function (err, add, fam) {
      if (err) reject(err);
      else resolve(add);
    });
  });
}

const config = {
  port: process.env.PORT || 8080,
  routes: {
    cors: {
        origin: ["Access-Control-Allow-Origin", "http://localhost:4200"], // an array of origins or 'ignore'
        "headers": ["Accept", "Content-Type"],
        "additionalHeaders": ["X-Requested-With"]
    },
    files: {
      relativeTo: Path.join(__dirname, 'images')
    }
  },
};

const init = async () => {
  await getAddress()
    .then((res) => {
      console.log("host address is " + res);
      config.host = "0.0.0.0"; //res;
    })
    .catch((err) => {
      console.log("cannot get ip address", err);
      return;
    });
  const server = Hapi.server(config);
  await server.register(require('@hapi/inert'));

  server.route({
    method: "GET",
    path: "/images/{image}",
    config: {
      cors,
    },
    handler: function(request, h) {
      return h.file(request.params.image);
    }
  });

  server.route({
    method: "GET",
    path: "/api/draft",
    config: {
      cors
    },
    handler: async (request, h) => {
      return await cflapi.draft();
    }
  })

  server.route({
    method: "GET",
    path: "/api/players",
    config: {
      cors,
    },
    handler: async (request, h) => {
      let data = await cflapi.players(request.query);
      return data;
    },
  });

  server.route({
    method: "GET",
    path: "/api/owners",
    config: {
      cors,
    },
    handler: async (request, h) => {
      let data = await cflapi.owners(request.query);
      return data;
    },
  });

  server.route({
    method: "GET",
    path: "/api/cflteams",
    config: {
      cors,
    },
    handler: async (request, h) => {
      return await cflapi.cflteams(request.query.id);
    },
  });

  server.route({
    method: "GET",
    path: "/api/cflschedule",
    config: {
      cors,
    },
    handler: async (request, h) => {
      const schedule = await cflapi.cflschedule(request.query.team);
      return request.query.week ? schedule[request.query.week] : schedule;
    },
  });

  server.route({
    method: "GET",
    path: "/api/week",
    config: {
      cors,
    },
    handler: (request, h) => {
        return {
            week: cflapi.week()
        };
    },
  });

  server.route({
    method: "GET",
    path: "/api/activations",
    config: {
      cors,
    },
    handler: async (request, h) => {
      return await cflapi.activations();
    },
  });

  server.route({
    method:["POST"],
    path: "/api/login",
    options: {
      cors,
      handler: async (req, h) => {
        return await cflapi.login(req.payload.owner_id, req.payload.password);
      }
    }
  })

  server.route({
    method: "GET",
    path: "/api/nflschedule",
    config: {
      cors,
    },
    handler: async (request, h) => {
      return await cflapi.nflschedule();
    }
  })

  server.route({
    method: "GET",
    path: "/api/nfl",
    config: {
      cors,
    },
    handler: async (request, h) => {
      return await cflapi.nflteams();
    },
  });

  server.route({
    method: "GET",
    path: "/api/statCodes",
    config: {
      cors,
    },
    handler: async (request, h) => {
      return await cflapi.statCodes();
    },
  });

  server.route({
    method: "GET",
    path: "/api/addWaiver",
    config: {
      cors,
    },
    handler: async (request, h) => {
      return await cflapi.addWaiver(request.query.w);
    },
  });

  server.route({
    method: "GET",
    path: "/api/waiver",
    config: {
      cors,
    },
    handler: async (request, h) => {
      return await cflapi
        .owners({
          owner_id: request.query.u,
          password: request.query.p,
        })
        .then(async (res) => {
          return await cflapi.waivers(res[0].team.toString()).catch((err) => {
            return err;
          });
        })
        .catch((err) => {
          return err;
        });
    },
  });

  server.route({
    method: "GET",
    path: "/api/player-test",
    config: {
      cors,
    },
    handler: async (request, h) => {
      socket.emit('nflschedule', {
        id: "c5722300-b37c-11eb-9617-afa9727fab42",
        data: {
          status: "in_game"
        },
      })
      return {};
    }
  })

  server.route({
    method: "GET",
    path: "/api/allsockets",
    config: {
      cors,
    },
    handler: async (request, h) => {
      const data = socket.allSockets();
      return _.map(data.sockets, x => x.id);
    }
  })

  await server.start();
  console.log("Server running on %s", server.info.uri);
  socket.connect(server.listener);
  setTimeout(ls.init, 2000);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();