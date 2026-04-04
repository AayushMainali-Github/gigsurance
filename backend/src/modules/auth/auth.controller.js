const { asyncHandler } = require("../../utils/asyncHandler");
const { signup, login, refreshSession } = require("./auth.service");
const { toUserDto } = require("../../utils/dto");

const signupController = asyncHandler(async (req, res) => {
  const result = await signup(req.body);
  res.status(201).json({
    ok: true,
    data: {
      user: {
        ...toUserDto(result.user)
      },
      accessToken: result.accessToken
    }
  });
});

const loginController = asyncHandler(async (req, res) => {
  const result = await login(req.body);
  res.json({
    ok: true,
    data: {
      user: {
        ...toUserDto(result.user)
      },
      accessToken: result.accessToken
    }
  });
});

const refreshController = asyncHandler(async (req, res) => {
  const result = await refreshSession(req.auth.sub);
  res.json({
    ok: true,
    data: {
      user: toUserDto(result.user),
      accessToken: result.accessToken
    }
  });
});

const logoutController = asyncHandler(async (_req, res) => {
  res.json({
    ok: true,
    data: {
      message: "Logged out on client side. Discard the access token."
    }
  });
});

module.exports = { signupController, loginController, refreshController, logoutController };
