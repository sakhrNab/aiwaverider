const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { admin, db } = require('./firebase');

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
    prompt: 'select_account'  // Add this line
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value.toLowerCase();
      
      // Create Firebase user if doesn't exist
      let firebaseUser;
      try {
        firebaseUser = await admin.auth().getUserByEmail(email);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          firebaseUser = await admin.auth().createUser({
            email: email,
            emailVerified: true,
            displayName: profile.displayName,
            photoURL: profile.photos[0]?.value
          });
        } else {
          throw error;
        }
      }

      // Check if user exists in Firestore
      let userDoc = await usersCollection.doc(firebaseUser.uid).get();
      
      if (!userDoc.exists) {
        // Create new user in Firestore
        const userData = {
          uid: firebaseUser.uid,
          email: email,
          username: email.split('@')[0],
          firstName: profile.name?.givenName || '',
          lastName: profile.name?.familyName || '',
          displayName: profile.displayName,
          photoURL: profile.photos[0]?.value,
          role: 'authenticated',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          provider: 'google'
        };

        await usersCollection.doc(firebaseUser.uid).set(userData);
        userDoc = await usersCollection.doc(firebaseUser.uid).get();
      }

      const userData = userDoc.data();
      return done(null, {
        uid: firebaseUser.uid,
        ...userData
      });
    } catch (error) {
      console.error('Error in Google Strategy:', error);
      return done(error);
    }
  }));
};

module.exports = { initializePassport };
