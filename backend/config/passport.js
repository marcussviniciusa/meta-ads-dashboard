const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const FacebookTokenStrategy = require('passport-facebook-token');
const User = require('../models/User');
require('dotenv').config();

// Estratégia JWT para autenticação de usuários
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      const user = await User.findById(payload.id);
      if (user) {
        return done(null, user);
      }
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  })
);

// Estratégia de token do Facebook/Meta para autenticação OAuth
passport.use(
  new FacebookTokenStrategy(
    {
      clientID: process.env.META_APP_ID,
      clientSecret: process.env.META_APP_SECRET,
      fbGraphVersion: process.env.META_API_VERSION
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Verificar se o usuário já existe
        let user = await User.findOne({ 'meta.id': profile.id });

        if (!user) {
          // Se o usuário não existe, criar um novo
          user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            meta: {
              id: profile.id,
              accessToken,
              refreshToken
            }
          });
          await user.save();
        } else {
          // Atualizar tokens se o usuário já existe
          user.meta.accessToken = accessToken;
          if (refreshToken) user.meta.refreshToken = refreshToken;
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

module.exports = passport;
