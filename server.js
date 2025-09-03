// jshint esversion:8

"use strict";

const Hapi = require("@hapi/hapi");
const Inert = require("@hapi/inert");
const Path = require('path');
const cflapi = require("./lib/cflapi.js");
const fs = require('fs');
const cors = {
  origin: ["*"],
  // headers: [
  //   "Access-Control-Allow-Origin",
  //   "Access-Control-Allow-Headers",
  //   "Access-Control-Allow-Methods",
  //   "Access-Control-Request-Headers",
  //   "Origin, X-Requested-With, Content-Type",
  //   "CORELATION_ID",
  // ],
  // additionalHeaders: ['cache-control', 'x-requested-with', 'X_AUTH_TOKEN'],
  // credentials: true,
};
const cor3s =  {
      "origin": ["http://192.168.1.13:4200"],
      "headers": ["Accept", "Content-Type"],
      "additionalHeaders": ["X-Requested-With"]
  }
const socket = require('./lib/socket');
const _ = require('lodash');
const multer = require('multer');
const path = require('path');
const colangelo = require('./lib/colangelo.js');

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './images')
    },
    filename : function(req, file, callback) {
        console.log(file)
        callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
  });
   //Store in storage
    const upload = multer({
        storage: storage
    });

const singleUpload = upload.single('newImage');

setTimeout(() => {
  require('./lib/loader');
}, 3000);

const { sendMail } = require('./lib/email');

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
  host: "0.0.0.0",
  // host: "http://192.168.12.252",
  routes: {
    cors: {
        origin: ['*'], // an array of origins or 'ignore'
        "headers": ["Accept", "Content-Type"],
        "additionalHeaders": ['cache-control', 'x-requested-with']
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
    method: "POST",
    path: "/api/updateTeamName",
    config: {
      cors
    },
    handler: async function(request, h) {
        const data = request.payload;
        await cflapi.UpdateTeam(data.teamid, "team_name", data.teamname);
        return h.response({ message: 'Name Updated successfully', data: data.teamname }).code(200);
    }
  })

  server.route({
    method: "POST",
    path: "/api/uploadlogo",
    options: {
        payload: {
            output: 'stream', // Output as a stream for file handling
            parse: true,
            multipart: true, // Enable multipart parsing
            maxBytes: 10 * 1024 * 1024
        }
    },
    handler: async function(request, h) {
        const data = request.payload;
        if (data.image) {
          const filename = data.teamid + "_" + data.image.hapi.filename;
          const uploadPath = path.join(__dirname, 'images', filename);

          const fileStream = fs.createWriteStream(uploadPath);
          await new Promise((resolve, reject) => {
              data.image.on('error', (err) => reject(err));
              data.image.pipe(fileStream);
              data.image.on('end', (err) => {
                if (err) reject(err);
                resolve(true);
              });
            });
            await cflapi.UpdateTeam(parseInt(data.teamid), "logo", filename);

            return h.response({ message: 'File uploaded successfully', filename }).code(200);
          }
        return h.response({ message: 'No file uploaded' }).code(400);
    }
  })

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
    method: "POST",
    path: "/api/wnba",
    config: {
      cors,
    },
    handler: async (request, h) => {
      return await cflapi.wnba(request.payload);
    }
  })


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
    path: "/api/weeklymessage",
    config: {
      cors
    },
    handler: async (request, h) => {
      return await cflapi.WeeklyMessage();
    }
  })

  server.route({
    method: "POST",
    path: "/api/message",
    config: {
      cors
    },
    handler: async (req, res) => {
      return await cflapi.Message(req.payload.data);
    }

  })

  server.route({
    method: "POST",
    path: "/api/updateowner",
    config: {
      cors
    },
    handler: async (req, res) => {
      return await cflapi.UpdateOwner(req.payload.owner_id, req.payload.property, req.payload.value);
    }
  })

  server.route({
    method: "POST",
    path: "/api/resetpassword",
    config: {
      cors
    },
    handler: async (req, res) => {
      console.log('Reset Password: ', req.payload.owner_id);
      return await cflapi.PasswordReset(req.payload.owner_id);
    }
  })

  server.route({
    method: "POST",
    path: "/api/login",
    config: {
      cors
    },
    handler: async (req, res) => {
      return await cflapi.login(req.payload.credentials.owner_id, req.payload.credentials.password, req.payload.credentials.key);
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
    path: "/health",
    config: {
      cors
    },
    handler: () => "ok"
  })

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
    handler: async (request, h) => {
        return await cflapi.week();
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
    method:"POST",
    path:"/colangelo/data",
    config: {
      cors,
    },
    handler: async(req, h) => {
      console.log('process Data', req.payload);
      return colangelo.processData(req.payload);
    }
  });

  server.route({
    method:"POST",
    path:"/colangelo/reset",
    config: {
      cors,
    },
    handler: async(req, h) => {
      return colangelo.resetGame(req.payload);
    }
  });

  server.route({
    method:"GET",
    path:"/colangelo/stats",
    config: {
      cors,
    },
    handler: async(req, h) => {
      return colangelo.getData();
    }
  });

  server.route({
    method:"GET",
    path:"/colangelo/compare",
    config: {
      cors,
    },
    handler: async(req, h) => {
      return colangelo.getCompare();
    }
  });

  // server.route({
  //   method:["POST"],
  //   path: "/api/login",
  //   options: {
  //     cors,
  //     handler: async (req, h) => {
  //       return await cflapi.login(req.payload.owner_id, req.payload.password);
  //     }
  //   }
  // })

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
    path: "/api/settings",
    config: {
      cors,
    },
    handler: async (request, h) => {
      return await cflapi.settings();
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
    path: "/api/moves",
    config: {
      cors,
    },
    handler: async (request, h) => {
      return await cflapi.moves();
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
      return data;
    }
  })

  server.route({
    method: "GET",
    path: "/api/email",
    config: {
      cors,
    },
    handler: async (request, h) => {
      sendMail().catch(console.error);
      return { dog: "Teddy" };
    }
  })

  await server.start();
  console.log("Server running on %s", server.info.uri);
  socket.connect(server.listener);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  //process.exit(1);
});

init();