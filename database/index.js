/* eslint-disable camelcase */
/* eslint-disable no-shadow */
/* eslint-disable no-console */
const mysql = require('mysql');

let connection;
if (!process.env.NODE_ENV) {
  connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'trailr',
  });
} else {
  connection = mysql.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    socketPath: `/cloudsql/${process.env.DB_INSTANCE_CONNECTION_NAME}`
  });
}

// connection.connect((error) => {
//   if (error) throw error;
//   console.log('Connected to mysql database.');
//   connection.rollback();
// });

const getUser = (id) => new Promise((resolve, reject) => {
  console.log('GET USER INVOKED');

  const getUserCommand = `
    SELECT *
    FROM users
    WHERE id = ?
  `;
  const getPhotosCommand = `
    SELECT *
    FROM photos
    WHERE id_user = ?
  `;
  const getCommentsCommand = `
    SELECT comments.*, users.*
    FROM comments
    LEFT JOIN users ON comments.id_user = users.id
    WHERE id_photo = ?
  `;

  connection.beginTransaction((error) => {
    if (error) {
      connection.rollback(() => {
        connection.release();
        return reject(error);
      });
    }
    connection.query(getUserCommand, [id], (error, gottenUser) => {
      if (error) { // maybe || rows.length > 1 OR separate error to handle more than one result?
        connection.rollback(() => {
          connection.release();
          return reject(error);
        });
      }
      const user = gottenUser[0];
      // const { id } = user;
      connection.query(getPhotosCommand, [id], (error, gottenPhotos) => {
        if (error) {
          connection.rollback(() => {
            connection.release();
            return reject(error);
          });
        }
        user.photos = gottenPhotos;
        if (!gottenPhotos.length) {
          connection.commit((error) => {
            if (error) {
              connection.rollback(() => {
                connection.release();
                return reject(error);
              });
            }
            resolve(user);
          });
        }
        user.photos.forEach((photo, i) => {
          const { id } = photo;
          connection.query(getCommentsCommand, [id], (error, gottenComments) => {
            if (error) {
              connection.rollback(() => {
                connection.release();
                return reject(error);
              });
            }
            user.photos[i].comments = gottenComments;
            if (i === user.photos.length - 1) {
              connection.commit((error) => {
                if (error) {
                  connection.rollback(() => {
                    connection.release();
                    return reject(error);
                  });
                }
                resolve(user);
              });
            }
          });
        });
      });
    });
  });
});

const addUser = (userObject) => new Promise((resolve, reject) => {
  console.log('ADD USER INVOKED');
  // Probably don't destructure because will error if undefined
  // const { google_id, name, profile_photo_url } = userObject;
  const checkUserCommand = `
    SELECT *
    FROM users
    WHERE google_id = ?
  `;
  const addUserCommand = `
    INSERT INTO users (google_id, name, profile_photo_url)
    VALUES (?, ?, ?)
  `;

  connection.beginTransaction((error) => {
    if (error) {
      connection.rollback(() => {
        connection.release();
        return reject(error);
      });
    }
    connection.query(checkUserCommand, [userObject.google_id], (error, userResult) => {
      if (error) {
        connection.rollback(() => {
          connection.release();
          return reject(error);
        });
      }
      if (userResult.length === 0) {
        connection.query(addUserCommand,
          [userObject.google_id, userObject.name, userObject.profile_photo_url],
          (error, addedUser) => {
            if (error) {
              connection.rollback(() => {
                connection.release();
                return reject(error);
              });
            }
            connection.commit((error) => {
              if (error) {
                connection.rollback(() => {
                  connection.release();
                  return reject(error);
                });
              }
              // resolve(addedUser, console.log('USER SUCCESSFULLY ADDED'));
              // resolve(getUser(addedUser.insertId));
              resolve({ id: addedUser.insertId });
            });
          });
      } else if (userResult.length > 0) {
        if (error) {
          connection.rollback(() => {
            connection.release();
            return reject(error);
          });
        }
        // resolve(getUser(userResult.id));
        resolve({ id: userResult.id });
      }
    });
  });
});

const getTrail = (/* id_trail, id_user */trailObject) => new Promise((resolve, reject) => {
  console.log('GET TRAIL INVOKED');

  const { id_trail, id_user } = trailObject; // TO CHANGE TO OBJ PARAMETERS

  const getTrailCommand = `
    SELECT *,
    (
      SELECT CAST(CAST(ROUND(AVG(value), 1) AS DECIMAL(2,1)) AS CHAR)
      FROM rating_difficulty
      WHERE id_trail = ?
    ) AS averageDifficulty,
    (
      SELECT CAST(CAST(ROUND(AVG(value), 1) AS DECIMAL(2,1)) AS CHAR)
      FROM rating_likeability
      WHERE id_trail = ?
    ) AS averageLikeability,
    (
      SELECT IFNULL((SELECT value
        FROM rating_difficulty
        WHERE id_user = ?
        AND id_trail = ?), 'Rate this trail:')
    ) as userDifficulty,
    (
      SELECT IFNULL((SELECT value
        FROM rating_likeability
        WHERE id_user = ?
        AND id_trail = ?), 'Rate this trail:')
    ) as userLikeability
    FROM trails
    WHERE id = ?
  `;

  const getPhotosCommand = `
    SELECT users.*, photos.*
    FROM photos
    LEFT JOIN users ON photos.id_user = users.id
    LEFT JOIN trails ON photos.id_trail = trails.id
    WHERE trails.id = ?
  `;

  const getCommentsCommand = `
    SELECT comments.*, users.*
    FROM comments
    LEFT JOIN users ON comments.id_user = users.id
    WHERE id_photo = ?
  `;

  connection.beginTransaction((error) => {
    if (error) {
      connection.rollback(() => {
        connection.release();
        return reject(error);
      });
    }
    connection.query(getTrailCommand,
      [id_trail, id_trail, id_user, id_trail, id_user, id_trail, id_trail],
      (error, gottenTrail) => {
        if (error) {
          connection.rollback(() => {
            connection.release();
            return reject(error);
          });
        }
        const trail = gottenTrail[0];
        const { id } = trail;
        connection.query(getPhotosCommand, [id], (error, gottenPhotos) => {
          if (error) {
            connection.rollback(() => {
              connection.release();
              return reject(error);
            });
          }
          if (!gottenPhotos.length) {
            connection.commit((error) => {
              if (error) {
                connection.rollback(() => {
                  connection.release();
                  return reject(error);
                });
              }
              resolve(trail);
            });
          }
          trail.photos = gottenPhotos;
          trail.photos.forEach((photo, i) => {
            const { id } = photo;
            connection.query(getCommentsCommand, [id], (error, gottenComments) => {
              if (error) {
                connection.rollback(() => {
                  connection.release();
                  return reject(error);
                });
              }
              trail.photos[i].comments = gottenComments;
              if (i === trail.photos.length - 1) {
                connection.commit((error) => {
                  if (error) {
                    connection.rollback(() => {
                      connection.release();
                      return reject(error);
                    });
                  }
                  resolve(trail);
                });
              }
            });
          });
        });
      });
  });
});

const addTrail = (trailObject) => new Promise((resolve, reject) => {
  console.log('ADD TRAIL INVOKED');
  // probably don't descructure because will error if undefined
  // const { id, name, city, region, country, latitude,
  // longitude, url, thumbnail, description } = trailObject;

  const checkTrailCommand = `
    SELECT *
    FROM trails
    WHERE api_id = ?
  `;
  const addTrailCommand = `
    INSERT INTO trails (api_id, name, city, region, country, latitude, longitude, url, thumbnail, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  connection.beginTransaction((error) => {
    if (error) {
      connection.rollback(() => {
        connection.release();
        return reject(error);
      });
    }
    connection.query(checkTrailCommand, [trailObject.id], (error, trailResult) => {
      if (error) {
        connection.rollback(() => {
          connection.release();
          return reject(error);
        });
      }
      if (trailResult.length === 0) {
        connection.query(addTrailCommand,
          // [id, name, city, region, country, latitude, longitude, url, thumbnail, description],
          // ***ID HERE IS API-ID until trail has been added
          [trailObject.id, trailObject.name, trailObject.city, trailObject.region,
            trailObject.country, trailObject.latitude, trailObject.longitude,
            trailObject.url, trailObject.thumbnail, trailObject.description],
          (error, addedTrail) => {
            if (error) {
              connection.rollback(() => {
                connection.release();
                return reject(error);
              });
            }
            connection.commit((error) => {
              if (error) {
                connection.rollback(() => {
                  connection.release();
                  return reject(error);
                });
              }
              resolve({ id: addedTrail.insertId }, console.log('TRAIL ADDED'));
            });
          });
      } else if (trailResult.length > 0) {
        if (error) {
          connection.rollback(() => {
            connection.release();
            return reject(error);
          });
        }
        resolve('Trail already exists.');
      }
    });
  });
});

const updateTrail = (trailObject) => new Promise((resolve, reject) => {
  console.log('UPDATE TRAIL INVOKED');
  const updateTrailCommand = `
    UPDATE trails
    SET
      api_id = ?,
      name = ?,
      city = ?,
      region = ?,
      country = ?,
      latitude = ?,
      longitude = ?,
      url = ?,
      thumbnail = ?,
      description = ?,
      status = ?
    WHERE id = ?
  `;

  connection.beginTransaction((error) => {
    if (error) {
      connection.rollback(() => {
        connection.release();
        return reject(error);
      });
    }
    connection.query(updateTrailCommand,
      [trailObject.api_id, trailObject.name, trailObject.city, trailObject.region,
        trailObject.country, trailObject.latitude, trailObject.longitude, trailObject.url,
        trailObject.thumbnail, trailObject.description, trailObject.status, trailObject.id],
      (error, updatedTrail) => {
        if (error) {
          connection.rollback(() => {
            connection.release();
            return reject(error);
          });
        }
        connection.commit((error) => {
          if (error) {
            connection.rollback(() => {
              connection.release();
              return reject(error);
            });
          }
          resolve(updatedTrail, console.log('TRAIL UPDATED'));
        });
      });
  });
});

const deleteTrail = (id) => new Promise((resolve, reject) => {
  console.log('DELETE TRAIL INVOKED');
  const deleteTrailCommand = `
    DELETE FROM trails
    WHERE id = ?
  `;
  connection.beginTransaction((error) => {
    if (error) {
      connection.rollback(() => {
        connection.release();
        return reject(error);
      });
    }
    connection.query(deleteTrailCommand, [id], (error, deletedTrailData) => {
      if (error) {
        connection.rollback(() => {
          connection.release();
          return reject(error);
        });
      }
      connection.commit((error) => {
        if (error) {
          connection.rollback(() => {
            connection.release();
            return reject(error);
          });
        }
        resolve(deletedTrailData, console.log('TRAIL DELETED'));
      });
    });
  });
});

const updateDifficulty = (difficultyObject) => new Promise((resolve, reject) => {
  console.log('UPDATE DIFFICULTY INVOKED');

  const { id_user, id_trail, value } = difficultyObject;

  const checkDifficultyCommand = `
    SELECT *
    FROM rating_difficulty
    WHERE id_user = ? AND id_trail = ?
  `;

  const addDifficultyCommand = `
    INSERT INTO rating_difficulty (id_user, id_trail, value)
    VALUES (?, ?, ?)
  `;

  const updateDifficultyCommand = `
    UPDATE rating_difficulty
    SET value = ?
    WHERE id_user = ? AND id_trail = ?
  `;

  const getAvgDiffCommand = `
      SELECT CAST(CAST(ROUND(AVG(value), 1) AS DECIMAL(2,1)) AS CHAR) AS averageDifficulty
      FROM rating_difficulty
      WHERE id_trail = ?
  `;

  connection.beginTransaction((error) => {
    if (error) {
      connection.rollback(() => {
        connection.release();
        return reject(error);
      });
    }
    connection.query(checkDifficultyCommand,
      [id_user, id_trail],
      (error, difficultyResult) => {
        if (error) {
          connection.rollback(() => {
            connection.release();
            return reject(error);
          });
        }
        if (difficultyResult.length === 0) {
          connection.query(addDifficultyCommand,
            [id_user, id_trail, value], (error, addedDifficulty) => {
              if (error) {
                connection.rollback(() => {
                  connection.release();
                  return reject(error);
                });
              }
              console.log('DIFFICULTY RATING ADDED: ', addedDifficulty);
            });
        } else if (difficultyResult.length > 0) {
          connection.query(updateDifficultyCommand,
            [value, id_user, id_trail],
            (error, updatedDifficulty) => {
              if (error) {
                connection.rollback(() => {
                  connection.release();
                  return reject(error);
                });
              }
              console.log('DIFFICULTY RATING UPDATED: ', updatedDifficulty);
            });
        }
        connection.query(getAvgDiffCommand,
          [id_trail],
          (error, newAvgDiff) => {
            if (error) {
              connection.rollback(() => {
                connection.release();
                return reject(error);
              });
            }
            connection.commit((error) => {
              if (error) {
                connection.rollback(() => {
                  connection.release();
                  return reject(error);
                });
              }
              resolve(newAvgDiff);
            });
          });
      });
  });
});

const updateLikeability = (likeabilityObject) => new Promise((resolve, reject) => {
  console.log('UPDATE LIKEABILITY INVOKED');

  const { id_user, id_trail, value } = likeabilityObject;

  const checkLikeabilityCommand = `
    SELECT *
    FROM rating_likeability
    WHERE id_user = ? AND id_trail = ?
  `;

  const addLikeabilityCommand = `
    INSERT INTO rating_likeability (id_user, id_trail, value)
    VALUES (?, ?, ?)
  `;

  const updateLikeabilityCommand = `
    UPDATE rating_likeability
    SET value = ?
    WHERE id_user = ? AND id_trail = ?
  `;

  const getAvgLikeCommand = `
    SELECT CAST(CAST(ROUND(AVG(value), 1) AS DECIMAL(2,1)) AS CHAR) AS averageLikeability
    FROM rating_likeability
    WHERE id_trail = ?
`;

  connection.beginTransaction((error) => {
    if (error) {
      connection.rollback(() => {
        connection.release();
        return reject(error);
      });
    }
    connection.query(checkLikeabilityCommand,
      [id_user, id_trail],
      (error, likeabilityResult) => {
        if (error) {
          connection.rollback(() => {
            connection.release();
            return reject(error);
          });
        }
        if (likeabilityResult.length === 0) {
          connection.query(addLikeabilityCommand,
            [id_user, id_trail, value], (error, addedLikeability) => {
              if (error) {
                connection.rollback(() => {
                  connection.release();
                  return reject(error);
                });
              }
              console.log('LIKEABILITY RATING ADDED: ', addedLikeability);
            });
        } else if (likeabilityResult.length > 0) {
          connection.query(updateLikeabilityCommand,
            [value, id_user, id_trail],
            (error, updatedLikeability) => {
              if (error) {
                connection.rollback(() => {
                  connection.release();
                  return reject(error);
                });
              }
              console.log('LIKEABILITY RATING UPDATED: ', updatedLikeability);
            });
        }
        connection.query(getAvgLikeCommand,
          [id_trail],
          (error, newAvgLike) => {
            if (error) {
              connection.rollback(() => {
                connection.release();
                return reject(error);
              });
            }
            connection.commit((error) => {
              if (error) {
                connection.rollback(() => {
                  connection.release();
                  return reject(error);
                });
              }
              resolve(newAvgLike);
            });
          });
      });
  });
});

const addComment = (commentObject) => new Promise((resolve, reject) => {
  console.log('ADD COMMENT INVOKED');

  const { text, id_user, id_photo } = commentObject;

  const addCommentCommand = `
    INSERT INTO comments (text, id_user, id_photo)
    VALUES (?, ?, ?)
  `;

  connection.beginTransaction((error) => {
    if (error) {
      connection.rollback(() => {
        connection.release();
        return reject(error);
      });
    }
    connection.query(addCommentCommand,
      [text, id_user, id_photo],
      (error, addedComment) => {
        if (error) {
          connection.rollback(() => {
            connection.release();
            return reject(error);
          });
        }
        connection.commit((error) => {
          if (error) {
            connection.rollback(() => {
              connection.release();
              return reject(error);
            });
          }
          console.log('COMMENT ADDED');
          resolve({ id: `${addedComment.insertId}` });
        });
      });
  });
});

const addPhoto = (photoObject) => new Promise((resolve, reject) => {
  console.log('ADD PHOTO INVOKED');

  const addPhotoCommand = `
    INSERT INTO photos (url, description, lat, lng, id_user, id_trail)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  connection.beginTransaction((error) => {
    if (error) {
      connection.rollback(() => {
        connection.release();
        return reject(error);
      });
    }
    connection.query(addPhotoCommand,
      [photoObject.url, photoObject.description, photoObject.lat,
        photoObject.lng, photoObject.id_user, photoObject.id_trail],
      (error, addedPhoto) => {
        if (error) {
          connection.rollback(() => {
            connection.release();
            return reject(error);
          });
        }
        connection.commit((error) => {
          if (error) {
            connection.rollback(() => {
              connection.release();
              return reject(error);
            });
          }
          console.log('PHOTO ADDED');
          resolve({ id: `${addedPhoto.insertId}` });
        });
      });
  });
});

const deleteComment = (id) => new Promise((resolve, reject) => {
  console.log('DELETE COMMENT INVOKED');

  const deleteCommentCommand = `
    DELETE FROM comments
    WHERE id = ?
  `;
  connection.beginTransaction((error) => {
    if (error) {
      connection.rollback(() => {
        connection.release();
        return reject(error);
      });
    }
    connection.query(deleteCommentCommand, [id], (error, deletedCommentData) => {
      if (error) {
        connection.rollback(() => {
          connection.release();
          return reject(error);
        });
      }
      connection.commit((error) => {
        if (error) {
          connection.rollback(() => {
            connection.release();
            return reject(error);
          });
        }
        resolve(deletedCommentData, console.log('COMMENT DELETED'));
      });
    });
  });
});

const deletePhoto = (id) => new Promise((resolve, reject) => {
  console.log('DELETE PHOTO INVOKED');

  const deleteCommentsCommand = `
    DELETE FROM comments
    where id_photo = ?
`;
  const deletePhotoCommand = `
    DELETE FROM photos
    WHERE id = ?
  `;

  connection.beginTransaction((error) => {
    if (error) {
      connection.rollback(() => {
        connection.release();
        return reject(error);
      });
    }
    connection.query(deleteCommentsCommand, [id], (error, deletedCommentData) => {
      if (error) {
        connection.rollback(() => {
          connection.release();
          return reject(error);
        });
      }
      connection.query(deletePhotoCommand, [id], (error, deletedPhotoData) => {
        if (error) {
          connection.rollback(() => {
            connection.release();
            return reject(error);
          });
        }
        connection.commit((error) => {
          if (error) {
            connection.rollback(() => {
              connection.release();
              return reject(error);
            });
          }
          const deletionResults = deletedPhotoData;
          deletionResults.deletedComments = deletedCommentData;
          resolve(deletionResults, console.log('PHOTO DELETED'));
        });
      });
    });
  });
});

module.exports = {
  getUser,
  addUser,
  getTrail,
  addTrail,
  updateTrail,
  deleteTrail,
  updateDifficulty,
  updateLikeability,
  addComment,
  addPhoto,
  deleteComment,
  deletePhoto,
};

// mysql -uroot < server/index.js
// mysql.server start
