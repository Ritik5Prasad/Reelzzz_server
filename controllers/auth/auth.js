const User = require("../../models/User");
const { StatusCodes } = require("http-status-codes");
const {
  BadRequestError,
  UnauthenticatedError,
  NotFoundError,
} = require("../../errors");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const axios = require("axios");
const Reward = require("../../models/Reward");
const Reel = require("../../models/Reel");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const checkUsernameAvailability = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    throw new BadRequestError("Username is required");
  }

  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;

  if (!usernameRegex.test(username)) {
    throw new BadRequestError(
      "Invalid username. Username can only contain letters, numbers, and underscores, and must be between 3 and 30 characters long."
    );
  }

  const user = await User.findOne({ username });

  if (user) {
    return res.status(StatusCodes.OK).json({ available: false });
  }

  res.status(StatusCodes.OK).json({ available: true });
};

const signUpWithOauth = async (req, res) => {
  const { provider, id_token, name, userImage, username, bio, email } =
    req.body;

  if (
    !provider ||
    !id_token ||
    !name ||
    !userImage ||
    !username ||
    !bio ||
    !email ||
    !["google", "facebook"].includes(provider)
  ) {
    throw new BadRequestError("Invalid body request");
  }

  try {
    let verifiedEmail;

    if (provider === "facebook") {
      const { data } = await axios.get(
        `https://graph.facebook.com/v20.0/me?access_token=${id_token}&fields=id,email`
      );
      verifiedEmail = data.email;
    }

    if (provider === "google") {
      const ticket = await googleClient.verifyIdToken({
        idToken: id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      verifiedEmail = payload.email;
    }
    if (verifiedEmail != email) {
      throw new UnauthenticatedError("Invalid Token or expired");
    }

    let user = await User.findOne({ email: verifiedEmail });

    if (!user) {
      user = new User({
        email: verifiedEmail,
        username,
        name,
        userImage,
        bio,
      });
      await user.save();
      const reward = new Reward({ user: user._id });
      await reward.save();
    }

    const accessToken = user.createAccessToken();
    const refreshToken = user.createRefreshToken();

    res.status(StatusCodes.OK).json({
      user: {
        name: user.name,
        id: user.id,
        username: user.username,
        userImage: user.userImage,
        email: user.email,
        bio: user.bio,
      },
      tokens: { access_token: accessToken, refresh_token: refreshToken },
    });
  } catch (error) {
    console.error(error);
    throw new UnauthenticatedError("Invalid Token or expired");
  }
};

const signInWithOauth = async (req, res) => {
  const { provider, id_token } = req.body;

  if (!provider || !id_token || !["google", "facebook"].includes(provider)) {
    throw new BadRequestError("Invalid body request");
  }

  try {
    let verifiedEmail;

    if (provider === "facebook") {
      const { data } = await axios.get(
        `https://graph.facebook.com/v20.0/me?access_token=${id_token}&fields=id,email`
      );
      verifiedEmail = data.email;
    }

    if (provider === "google") {
      const ticket = await googleClient.verifyIdToken({
        idToken: id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      verifiedEmail = payload.email;
    }

    const user = await User.findOne({ email: verifiedEmail }).select(
      "-followers -following"
    );
    const followersCount = await User.countDocuments({ following: user._id });
    const followingCount = await User.countDocuments({ followers: user._id });
    const reelsCount = await Reel.countDocuments({ user: user._id });

    if (!user) {
      throw new NotFoundError("User does not exist");
    }

    const accessToken = user.createAccessToken();
    const refreshToken = user.createRefreshToken();

    res.status(StatusCodes.OK).json({
      user: {
        name: user.name,
        id: user.id,
        username: user.username,
        userImage: user.userImage,
        email: user.email,
        followersCount,
        followingCount,
        reelsCount,
        bio: user.bio,
      },
      tokens: { access_token: accessToken, refresh_token: refreshToken },
    });
  } catch (error) {
    console.error(error);
    throw new UnauthenticatedError("Invalid Token or expired");
  }
};

const refreshToken = async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    throw new BadRequestError("Refresh token is required");
  }

  try {
    const payload = jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(payload.userId);

    if (!user) {
      throw new UnauthenticatedError("Invalid refresh token");
    }

    const newAccessToken = user.createAccessToken();
    const newRefreshToken = user.createRefreshToken();

    res.status(StatusCodes.OK).json({
      tokens: { access_token: newAccessToken, refresh_token: newRefreshToken },
    });
  } catch (error) {
    console.error(error);
    throw new UnauthenticatedError("Invalid refresh token");
  }
};

module.exports = {
  signInWithOauth,
  signUpWithOauth,
  refreshToken,
  checkUsernameAvailability,
};
