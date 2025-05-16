// // src/utils/api.jsx

// import { api, API_URL } from './apiConfig';
// import { 
//   createSession, 
//   signOutUser, 
//   signUp, 
//   signIn, 
//   signInWithGoogle, 
//   signUpWithGoogle, 
//   signUpWithMicrosoft, 
//   signInWithMicrosoft 
// } from './authApi';
// import { 
//   getProfile, 
//   updateProfile, 
//   updateInterests,
//   getNotifications,
//   updateNotifications,
//   getSubscriptions,
//   getFavorites,
//   addFavorite,
//   removeFavorite,
//   getCommunityInfo,
//   uploadProfileImage
// } from './profileApi';
// import { 
//   createPost, 
//   getAllPosts, 
//   getComments, 
//   addComment, 
//   deletePost, 
//   updatePost, 
//   getPostById, 
//   incrementPostView,
//   likeComment,
//   unlikeComment,
//   deleteComment,
//   updateComment,
//   toggleLike 
// } from './postApi';
// import {
//   getAllAgents,
//   getPublicAgents,
//   getAgentById,
//   createAgent,
//   updateAgent,
//   deleteAgent,
//   getAgentReviews,
//   addAgentReview,
//   getAgentCategories,
//   subscribeToAgent,
//   updateAgentPrice,
//   getFeaturedAgents,
//   getTopRatedAgents,
//   getNewestAgents,
//   searchAgents,
//   fetchAgents,
//   fetchFeaturedAgents,
//   fetchWishlists,
//   toggleAgentLike,
//   addToWishlist,
//   removeFromWishlist,
//   toggleWishlist,
//   checkCanReviewAgent,
//   checkApiStatus,
//   downloadFreeAgent,
//   fetchAgentById,
//   getUserLikeStatus,
//   incrementAgentDownloadCount,
//   recordAgentDownload
// } from './agentApi';
// import {
//   initializeCheckout,
//   getPaymentMethods,
//   addPaymentMethod,
//   deletePaymentMethod,
//   setDefaultPaymentMethod,
//   getCustomerSubscriptions,
//   cancelSubscription,
//   reactivateSubscription,
//   updateSubscriptionPlan,
//   getInvoices,
//   getInvoiceById,
//   getAgentPlans,
//   createPromoCode,
//   validatePromoCode,
//   getCheckoutSessionStatus
// } from './checkoutApi';
// import {
//   getUserNotifications,
//   markNotificationAsRead,
//   markAllNotificationsAsRead,
//   getNotificationPreferences,
//   updateNotificationPreferences,
//   deleteNotification,
//   deleteAllNotifications,
//   getUnreadNotificationCount,
//   subscribeToPushNotifications,
//   unsubscribeFromPushNotifications
// } from './notificationApi';
// import {
//   fetchAITools,
//   fetchAIToolById,
//   createAITool,
//   updateAITool,
//   deleteAITool,
//   searchAITools,
//   getFeaturedAITools,
//   getAIToolsByCategory,
//   rateAITool
// } from './aiToolsApi';
// import {
//   fetchUsers,
//   createUser,
//   updateUser,
//   deleteUser,
//   getUserRoles,
//   sendUserNotification,
//   getUserStats
// } from './adminManageUsersApi';

// // Export all the API functions and utilities
// export {
//   API_URL,
//   api,
  
//   // Auth API exports
//   createSession,
//   signOutUser,
//   signUp,
//   signIn,
//   signInWithGoogle,
//   signUpWithGoogle,
//   signUpWithMicrosoft,
//   signInWithMicrosoft,
  
//   // Profile API exports
//   getProfile,
//   updateProfile,
//   updateInterests,
//   getNotifications,
//   updateNotifications,
//   getSubscriptions,
//   getFavorites,
//   addFavorite,
//   removeFavorite,
//   getCommunityInfo,
//   uploadProfileImage,
  
//   // Post API exports
//   createPost,
//   getAllPosts,
//   getComments,
//   addComment,
//   deletePost,
//   updatePost,
//   getPostById,
//   incrementPostView,
//   likeComment,
//   unlikeComment,
//   deleteComment,
//   updateComment,
//   toggleLike,
  
//   // Agent API exports
//   getAllAgents,
//   getPublicAgents,
//   getAgentById,
//   createAgent,
//   updateAgent,
//   deleteAgent,
//   getAgentReviews,
//   addAgentReview,
//   getAgentCategories,
//   subscribeToAgent,
//   updateAgentPrice,
//   getFeaturedAgents,
//   getTopRatedAgents,
//   getNewestAgents,
//   searchAgents,
//   fetchAgents,
//   fetchFeaturedAgents,
//   fetchWishlists,
//   toggleAgentLike,
//   addToWishlist,
//   removeFromWishlist,
//   toggleWishlist,
//   checkCanReviewAgent,
//   checkApiStatus,
//   downloadFreeAgent,
//   fetchAgentById,
//   getUserLikeStatus,
//   incrementAgentDownloadCount,
//   recordAgentDownload,
  
//   // User Management API exports
//   fetchUsers,
//   createUser,
//   updateUser,
//   deleteUser,
//   getUserRoles,
//   sendUserNotification,
//   getUserStats,
  
//   // AI Tools API exports
//   fetchAITools,
//   fetchAIToolById,
//   createAITool,
//   updateAITool,
//   deleteAITool,
//   searchAITools,
//   getFeaturedAITools,
//   getAIToolsByCategory,
//   rateAITool,
  
//   // Checkout API exports
//   initializeCheckout,
//   getPaymentMethods,
//   addPaymentMethod,
//   deletePaymentMethod,
//   setDefaultPaymentMethod,
//   getCustomerSubscriptions,
//   cancelSubscription,
//   reactivateSubscription,
//   updateSubscriptionPlan,
//   getInvoices,
//   getInvoiceById,
//   getAgentPlans,
//   createPromoCode,
//   validatePromoCode,
//   getCheckoutSessionStatus,
  
//   // Notification API exports
//   getUserNotifications,
//   markNotificationAsRead,
//   markAllNotificationsAsRead,
//   getNotificationPreferences,
//   updateNotificationPreferences,
//   deleteNotification,
//   deleteAllNotifications,
//   getUnreadNotificationCount,
//   subscribeToPushNotifications,
//   unsubscribeFromPushNotifications
// };

// // Keep the rest of the original file below this line
// // This is just the bridge while we continue refactoring the remaining functions
// // You should eventually remove the code below as you break it into separate modules

// // ========================================================================
// // ================ Below this line needs further refactoring =============
// // ========================================================================

// // src/utils/api.jsx - remaining code (to be refactored in follow-up tasks)

