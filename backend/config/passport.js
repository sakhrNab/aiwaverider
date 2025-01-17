const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { db } = require('./firebase');

const initializePassport = (passport) => {
  const usersCollection = db.collection('users');

  // Serialize user for the session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id, done) => {
    try {
      const userDoc = await usersCollection.doc(id).get();
      if (!userDoc.exists) {
        return done(null, null);
      }
      done(null, { id: userDoc.id, ...userDoc.data() });
    } catch (error) {
      done(error, null);
    }
  });

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL, // Use the environment variable
    passReqToCallback: true,
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const userSnapshot = await usersCollection
        .where('email', '==', profile.emails[0].value.toLowerCase())
        .limit(1)
        .get();

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();
        return done(null, {
          id: userDoc.id,
          username: userData.username,
          email: userData.email,
          role: userData.role
        });
      }

      const username = profile.emails[0].value.split('@')[0];
      const newUserData = {
        username,
        email: profile.emails[0].value.toLowerCase(),
        firstName: profile.name.givenName || '',
        lastName: profile.name.familyName || '',
        role: 'authenticated',
        googleId: profile.id
      };

      const newUserRef = await usersCollection.add(newUserData);
      return done(null, {
        id: newUserRef.id,
        ...newUserData
      });
    } catch (error) {
      return done(error);
    }
  }));
};

module.exports = { initializePassport };
