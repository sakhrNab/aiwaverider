/**
 * Post Repository
 * Handles all database interactions for posts
 */
const admin = require('firebase-admin');
const logger = require('../../utils/logger');

class PostRepository {
  constructor() {
    this.postsCollection = admin.firestore().collection('posts');
    this.commentsCollection = admin.firestore().collection('comments');
    this.usersCollection = admin.firestore().collection('users');
  }

  async createPost(postData) {
    try {
      const newPostRef = await this.postsCollection.add({
        ...postData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const newPostDoc = await newPostRef.get();
      return { id: newPostRef.id, ...newPostDoc.data() };
    } catch (error) {
      logger.error('Error in PostRepository.createPost:', error);
      throw error;
    }
  }

  async getPosts(category = 'All', limit = 10, startAfter = null) {
    try {
      let query = this.postsCollection.orderBy('createdAt', 'desc');
      
      if (category !== 'All') {
        query = query.where('category', '==', category);
      }
      
      if (startAfter) {
        const startAfterDoc = await this.postsCollection.doc(startAfter).get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      }
      
      query = query.limit(parseInt(limit));
      
      const snapshot = await query.get();
      const posts = [];
      let lastDoc = null;

      snapshot.forEach((doc) => {
        posts.push({ id: doc.id, ...doc.data() });
        lastDoc = doc;
      });

      return {
        posts,
        lastPostId: lastDoc ? lastDoc.id : null,
        hasMore: posts.length === parseInt(limit)
      };
    } catch (error) {
      logger.error('Error in PostRepository.getPosts:', error);
      throw error;
    }
  }

  async getPostById(postId) {
    try {
      const postDoc = await this.postsCollection.doc(postId).get();
      
      if (!postDoc.exists) {
        return null;
      }

      return { id: postDoc.id, ...postDoc.data() };
    } catch (error) {
      logger.error(`Error in PostRepository.getPostById for postId ${postId}:`, error);
      throw error;
    }
  }

  async updatePost(postId, updates) {
    try {
      updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      await this.postsCollection.doc(postId).update(updates);

      const updatedDoc = await this.postsCollection.doc(postId).get();
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      logger.error(`Error in PostRepository.updatePost for postId ${postId}:`, error);
      throw error;
    }
  }

  async deletePost(postId) {
    try {
      // First, delete all comments associated with this post
      const commentsSnapshot = await this.commentsCollection.where('postId', '==', postId).get();
      
      const batch = admin.firestore().batch();
      commentsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Then delete the post
      batch.delete(this.postsCollection.doc(postId));
      
      await batch.commit();
      return true;
    } catch (error) {
      logger.error(`Error in PostRepository.deletePost for postId ${postId}:`, error);
      throw error;
    }
  }

  async toggleLike(postId, userId) {
    try {
      const postRef = this.postsCollection.doc(postId);
      const postDoc = await postRef.get();
      
      if (!postDoc.exists) {
        return null;
      }
      
      const post = postDoc.data();
      const likes = post.likes || [];
      const userLikedIndex = likes.indexOf(userId);
      
      if (userLikedIndex === -1) {
        // User hasn't liked the post yet, add like
        likes.push(userId);
      } else {
        // User already liked the post, remove like
        likes.splice(userLikedIndex, 1);
      }
      
      await postRef.update({ 
        likes, 
        updatedAt: admin.firestore.FieldValue.serverTimestamp() 
      });
      
      const updatedDoc = await postRef.get();
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      logger.error(`Error in PostRepository.toggleLike for postId ${postId}:`, error);
      throw error;
    }
  }

  async getMultiCategoryPosts(categories, limit = 5) {
    try {
      const categoryArray = Array.isArray(categories) ? categories : categories.split(',').map(c => c.trim());
      const results = {};

      for (const cat of categoryArray) {
        let query = this.postsCollection.orderBy('createdAt', 'desc').limit(parseInt(limit));
        if (cat !== 'All') {
          query = query.where('category', '==', cat);
        }

        const snapshot = await query.get();
        const posts = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          createdAt: doc.data().createdAt ? doc.data().createdAt.toDate().toISOString() : null,
        }));

        const postIds = posts.map(post => post.id);
        results[cat] = { posts, postIds };
      }

      return results;
    } catch (error) {
      logger.error('Error in PostRepository.getMultiCategoryPosts:', error);
      throw error;
    }
  }

  async getPostComments(postId, limit = 50, startAfter = null) {
    try {
      let query = this.commentsCollection
        .where('postId', '==', postId)
        .orderBy('createdAt', 'desc');

      if (startAfter) {
        const startAfterDoc = await this.commentsCollection.doc(startAfter).get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      }

      query = query.limit(parseInt(limit));
      const snapshot = await query.get();
      
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt ? doc.data().createdAt.toDate().toISOString() : null,
      }));

      return comments;
    } catch (error) {
      logger.error(`Error in PostRepository.getPostComments for postId ${postId}:`, error);
      throw error;
    }
  }

  async addComment(commentData) {
    try {
      const newCommentRef = await this.commentsCollection.add({
        ...commentData,
        likes: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const newCommentDoc = await newCommentRef.get();
      const data = newCommentDoc.data();
      
      return { 
        id: newCommentRef.id, 
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      };
    } catch (error) {
      logger.error('Error in PostRepository.addComment:', error);
      throw error;
    }
  }

  async updateComment(commentId, content) {
    try {
      await this.commentsCollection.doc(commentId).update({
        content,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const updatedDoc = await this.commentsCollection.doc(commentId).get();
      const data = updatedDoc.data();
      
      return { 
        id: updatedDoc.id, 
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      };
    } catch (error) {
      logger.error(`Error in PostRepository.updateComment for commentId ${commentId}:`, error);
      throw error;
    }
  }

  async deleteComment(commentId) {
    try {
      await this.commentsCollection.doc(commentId).delete();
      return true;
    } catch (error) {
      logger.error(`Error in PostRepository.deleteComment for commentId ${commentId}:`, error);
      throw error;
    }
  }

  async toggleCommentLike(commentId, userId) {
    try {
      const commentRef = this.commentsCollection.doc(commentId);
      const commentDoc = await commentRef.get();
      
      if (!commentDoc.exists) {
        return null;
      }
      
      const comment = commentDoc.data();
      const likes = comment.likes || [];
      const userLikedIndex = likes.indexOf(userId);
      
      if (userLikedIndex === -1) {
        // User hasn't liked the comment yet, add like
        likes.push(userId);
      } else {
        // User already liked the comment, remove like
        likes.splice(userLikedIndex, 1);
      }
      
      await commentRef.update({ 
        likes, 
        updatedAt: admin.firestore.FieldValue.serverTimestamp() 
      });
      
      const updatedDoc = await commentRef.get();
      const data = updatedDoc.data();
      
      return { 
        id: updatedDoc.id, 
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      };
    } catch (error) {
      logger.error(`Error in PostRepository.toggleCommentLike for commentId ${commentId}:`, error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const userDoc = await this.usersCollection.doc(userId).get();
      if (!userDoc.exists) {
        return null;
      }
      return { id: userDoc.id, ...userDoc.data() };
    } catch (error) {
      logger.error(`Error in PostRepository.getUserById for userId ${userId}:`, error);
      throw error;
    }
  }
}

module.exports = new PostRepository(); 