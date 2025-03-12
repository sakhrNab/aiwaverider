const { db } = require('../config/firebase');
const bcrypt = require('bcrypt');
const { sanitizeUser } = require('../utils/sanitize');

// Collection reference
const usersCollection = db.collection('users');

/**
 * Get all users with pagination, filtering and sorting
 */
exports.getUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      sortBy = 'createdAt', 
      sortDirection = 'desc' 
    } = req.query;

    // Convert to numbers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    
    // Calculate offset
    const offset = (pageNum - 1) * limitNum;
    
    // Start with base query
    let query = usersCollection;
    
    // Add search if provided
    if (search) {
      // Firebase doesn't support full text search, so we have to do multiple queries
      // This is a simple implementation - for production, consider using Algolia or ElasticSearch
      const searchLower = search.toLowerCase();
      
      // Get users where username, email, firstName, or lastName contains the search term
      query = query.where('searchField', '>=', searchLower)
                   .where('searchField', '<=', searchLower + '\uf8ff');
    }
    
    // Get total count for pagination
    const countSnapshot = await query.count().get();
    const totalUsers = countSnapshot.data().count;
    
    // Add sorting
    if (sortBy && sortDirection) {
      query = query.orderBy(sortBy, sortDirection);
    }
    
    // Add pagination
    query = query.limit(limitNum).offset(offset);
    
    // Execute query
    const usersSnapshot = await query.get();
    
    // Format data
    const users = [];
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      
      // Helper function to safely format timestamps
      const formatTimestamp = (timestamp) => {
        if (!timestamp) return null;
        // Check if it's a Firestore timestamp with toDate function
        if (timestamp && typeof timestamp.toDate === 'function') {
          return timestamp.toDate().toISOString();
        }
        // If it's already a Date object
        if (timestamp instanceof Date) {
          return timestamp.toISOString();
        }
        // If it's a string that might be ISO format already
        if (typeof timestamp === 'string') {
          return timestamp;
        }
        // Fallback
        return null;
      };
      
      users.push({
        id: doc.id,
        username: userData.username || userData.displayName,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        photoURL: userData.photoURL,
        role: userData.role,
        status: userData.status || 'active',
        createdAt: formatTimestamp(userData.createdAt),
        updatedAt: formatTimestamp(userData.updatedAt)
      });
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalUsers / limitNum);
    
    return res.json({
      users,
      currentPage: pageNum,
      totalPages,
      total: totalUsers,
      limit: limitNum
    });
  } catch (error) {
    console.error('Error in getUsers:', error);
    return res.status(500).json({ error: 'Failed to retrieve users' });
  }
};

/**
 * Get a single user by ID
 */
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userDoc = await usersCollection.doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Return user data without sensitive information
    return res.json({
      id: userDoc.id,
      username: userData.username || userData.displayName,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      photoURL: userData.photoURL,
      role: userData.role,
      status: userData.status || 'active',
      createdAt: userData.createdAt ? userData.createdAt.toDate().toISOString() : null,
      updatedAt: userData.updatedAt ? userData.updatedAt.toDate().toISOString() : null
    });
  } catch (error) {
    console.error('Error in getUserById:', error);
    return res.status(500).json({ error: 'Failed to retrieve user' });
  }
};

/**
 * Create a new user
 */
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role, status } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    // Check if email already exists
    const emailQuery = await usersCollection.where('email', '==', email.toLowerCase()).get();
    if (!emailQuery.empty) {
      return res.status(400).json({ error: 'Email is already registered' });
    }
    
    // Check if username already exists
    const usernameQuery = await usersCollection.where('username', '==', username).get();
    if (!usernameQuery.empty) {
      return res.status(400).json({ error: 'Username is already taken' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create searchable fields
    const searchField = `${username.toLowerCase()} ${email.toLowerCase()} ${firstName ? firstName.toLowerCase() : ''} ${lastName ? lastName.toLowerCase() : ''}`;
    
    // Prepare user data
    const userData = {
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      role: role || 'user',
      status: status || 'active',
      searchField,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Create user in Firestore
    const userRef = await usersCollection.add(userData);
    
    // Return success with user data (excluding password)
    return res.status(201).json({
      id: userRef.id,
      username,
      email: email.toLowerCase(),
      firstName: firstName || '',
      lastName: lastName || '',
      role: role || 'user',
      status: status || 'active',
      createdAt: userData.createdAt.toISOString(),
      updatedAt: userData.updatedAt.toISOString()
    });
  } catch (error) {
    console.error('Error in createUser:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
};

/**
 * Update an existing user
 */
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, password, firstName, lastName, role, status } = req.body;
    
    // Validate user exists
    const userDoc = await usersCollection.doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Check if email is being changed and already exists
    if (email && email.toLowerCase() !== userData.email) {
      const emailQuery = await usersCollection.where('email', '==', email.toLowerCase()).get();
      if (!emailQuery.empty) {
        return res.status(400).json({ error: 'Email is already registered' });
      }
    }
    
    // Check if username is being changed and already exists
    if (username && username !== userData.username) {
      const usernameQuery = await usersCollection.where('username', '==', username).get();
      if (!usernameQuery.empty) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
    }
    
    // Prepare update data
    const updateData = {
      updatedAt: new Date()
    };
    
    // Only add fields that are provided
    if (username) updateData.username = username;
    if (email) updateData.email = email.toLowerCase();
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    
    // Update searchable field if any of these fields change
    if (username || email || firstName || lastName) {
      updateData.searchField = `${username || userData.username}.toLowerCase() ${email ? email.toLowerCase() : userData.email} ${firstName !== undefined ? firstName.toLowerCase() : userData.firstName ? userData.firstName.toLowerCase() : ''} ${lastName !== undefined ? lastName.toLowerCase() : userData.lastName ? userData.lastName.toLowerCase() : ''}`;
    }
    
    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    // Update user in Firestore
    await usersCollection.doc(userId).update(updateData);
    
    // Get updated user data
    const updatedUserDoc = await usersCollection.doc(userId).get();
    const updatedUserData = updatedUserDoc.data();
    
    // Helper function to safely format timestamps
    const formatTimestamp = (timestamp) => {
      if (!timestamp) return null;
      // Check if it's a Firestore timestamp with toDate function
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toISOString();
      }
      // If it's already a Date object
      if (timestamp instanceof Date) {
        return timestamp.toISOString();
      }
      // If it's a string that might be ISO format already
      if (typeof timestamp === 'string') {
        return timestamp;
      }
      // Fallback
      return null;
    };
    
    // Return updated user data
    return res.json({
      id: userId,
      username: updatedUserData.username || updatedUserData.displayName,
      email: updatedUserData.email,
      firstName: updatedUserData.firstName || '',
      lastName: updatedUserData.lastName || '',
      role: updatedUserData.role,
      status: updatedUserData.status || 'active',
      createdAt: formatTimestamp(updatedUserData.createdAt),
      updatedAt: formatTimestamp(updatedUserData.updatedAt)
    });
  } catch (error) {
    console.error('Error in updateUser:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
};

/**
 * Delete a user
 */
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate user exists
    const userDoc = await usersCollection.doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if this is the last admin user
    const userData = userDoc.data();
    if (userData.role === 'admin') {
      const adminQuery = await usersCollection.where('role', '==', 'admin').get();
      if (adminQuery.size <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }
    
    // Delete user from Firestore
    await usersCollection.doc(userId).delete();
    
    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
}; 