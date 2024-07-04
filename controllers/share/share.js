const { BadRequestError, NotFoundError } = require("../../errors");
const Reel = require("../../models/Reel");
const User = require("../../models/User");

const share = async (req, res) => {
  const { type, id } = req.params;

  if ((type != "user" && type != "reel") || !id) {
    throw new BadRequestError("Invalid Body");
  }

  let title, description, imageUrl, url;

  try {
    if (type === "user") {
      // Fetch user details from your database
      const user = await User.findOne({ username: id });
      if (!user) {
        return res.status(404).send("User not found");
      }
      title = `Check out ${user.username}'s profile on Reelzzz`;
      description = user.bio
        ? user.bio
        : `${user.username} shares amazing reels on Reelzzz.`;
      imageUrl = user.userImage
        ? user.userImage
        : "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
      url = `http://localhost:3000/user/@${user.username}`;
    } else if (type === "reel") {
      const reel = await Reel.findById(id).populate("user");
      if (!reel) {
        return res.status(404).send("Reel not found");
      }
      title = `Watch this amazing reel by ${reel.user.username} on Reelzzz`;
      description = reel.caption
        ? reel.caption
        : `Check out this cool reel on Reelzzz.`;
      imageUrl = reel.thumbUri
        ? reel.thumbUri
        : "https://static-00.iconduck.com/assets.00/video-x-generic-icon-512x388-1u3h7equ.png";
      url = `http://localhost:3000/reel/${reel._id}`;
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <meta property="og:title" content="${title}">
          <meta property="og:description" content="${description}">
          <meta property="og:image" content="${imageUrl}">
          <meta property="og:url" content="${url}">
          <meta property="og:type" content="website">
          <style>
              body {
                  background-color: #121212;
                  color: #ffffff;
                  font-family: Arial, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
              }
              .container {
                  text-align: center;
                  padding: 20px;
                  border: 1px solid #333;
                  border-radius: 8px;
                  background-color: #1e1e1e;
              }
              .icon {
                  width: 100px;
                  height: 100px;
                  margin-bottom: 20px;
              }
              .title {
                  font-size: 24px;
                  font-weight: bold;
                  margin-bottom: 10px;
              }
              .description {
                  font-size: 18px;
                  margin-bottom: 20px;
              }
              .image {
                  width: 100%;
                  max-width: 150px;
                  max-height:300px;
                  resize-mode:'cover';
                  border-radius: 8px;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <img class="icon" src="https://res.cloudinary.com/dponzgerb/image/upload/v1720080478/qlkp7z3muc2qw3dhfism.png" alt="App Icon">
              <div class="title">${title}</div>
              <div class="description">${description}</div>
              <img class="image" src="${imageUrl}" alt="Preview Image">
              <p>Download our app <a href="${url}" style="color: #1e90ff;">Drive Link or PlayStore or AppStores</a></p>
          </div>
      </body>
      </html>
    `);
  } catch (error) {
    throw new NotFoundError("Resource not found");
  }
};

module.exports = { share };
