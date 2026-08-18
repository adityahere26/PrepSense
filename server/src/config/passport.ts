import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../db.js';

const clientID = process.env.GOOGLE_CLIENT_ID || '';
const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback';

if (clientID && clientSecret && clientID !== 'mock_google_client_id') {
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          const photoUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

          let user = await prisma.user.findUnique({
            where: { googleId: profile.id },
          });

          if (user) {
            if (photoUrl && user.picture !== photoUrl) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  picture: photoUrl,
                  name: user.name || profile.displayName || email.split('@')[0],
                },
              });
            }
          } else {
            user = await prisma.user.findUnique({
              where: { email },
            });

            if (user) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  googleId: profile.id,
                  picture: photoUrl || user.picture,
                  name: user.name || profile.displayName || email.split('@')[0],
                },
              });
            } else {
              user = await prisma.user.create({
                data: {
                  email,
                  name: profile.displayName || email.split('@')[0],
                  googleId: profile.id,
                  picture: photoUrl,
                },
              });
            }
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );
} else {
  console.warn('⚠️ Google OAuth credentials not configured or set to mock values. OAuth endpoints will fall back to mock auth.');
}

export default passport;
