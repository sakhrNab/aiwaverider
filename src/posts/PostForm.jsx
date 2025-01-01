// // src/posts/PostForm.jsx

// import React, { useState } from 'react';
// import TipTapEditor from '../components/TipTapEditor'; // Import the updated TipTapEditor
// import { CATEGORIES } from '../constants/categories'; // Ensure this exists

// const PostForm = ({ onSubmit, initialData = {} }) => {
//   const [formData, setFormData] = useState({
//     title: initialData.title || '',
//     description: initialData.description || '',
//     category: initialData.category || 'Trends',
//     image: initialData.image || null,
//     additionalHTML: initialData.additionalHTML || '',
//     graphHTML: initialData.graphHTML || '',
//   });

//   const [error, setError] = useState('');

//   const handleInputChange = (e) => {
//     const { name, value, files } = e.target;
//     if (name === 'image') {
//       const file = files[0];
//       if (file && file.size > 5 * 1024 * 1024) { // 5MB limit
//         setError('Image size should not exceed 5MB.');
//         return;
//       }
//       setFormData((prev) => ({ ...prev, image: file }));
//       setError('');
//     } else {
//       setFormData((prev) => ({ ...prev, [name]: value }));
//     }
//   };

//   const handleEditorChange = (field, htmlString) => {
//     setFormData((prev) => ({
//       ...prev,
//       [field]: htmlString,
//     }));
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     onSubmit(formData);
//   };

//   return (
//     <form onSubmit={handleSubmit} className="space-y-4">
//       {/* Title */}
//       <div>
//         <label className="block text-gray-700">Title</label>
//         <input
//           type="text"
//           name="title"
//           value={formData.title}
//           onChange={handleInputChange}
//           className="mt-1 w-full p-2 border border-gray-300 rounded-md"
//           placeholder="Enter post title"
//           required
//         />
//       </div>

//       {/* Description */}
//       <div>
//         <label className="block text-gray-700">Description</label>
//         <textarea
//           name="description"
//           value={formData.description}
//           onChange={handleInputChange}
//           className="mt-1 w-full p-2 border border-gray-300 rounded-md"
//           placeholder="Enter post description"
//           rows="4"
//           required
//         />
//       </div>

//       {/* Category */}
//       <div>
//         <label className="block text-gray-700">Category</label>
//         <select
//           name="category"
//           value={formData.category}
//           onChange={handleInputChange}
//           className="mt-1 w-full p-2 border border-gray-300 rounded-md"
//           required
//         >
//           {CATEGORIES.map((cat) => (
//             <option key={cat} value={cat}>
//               {cat}
//             </option>
//           ))}
//         </select>
//       </div>

//       {/* Image */}
//       <div>
//         <label className="block text-gray-700">
//           Image {initialData.id ? '(Leave blank to keep existing)' : '(Optional)'}
//         </label>
//         <input
//           type="file"
//           name="image"
//           accept="image/*"
//           onChange={handleInputChange}
//           className="mt-1 w-full p-2 border border-gray-300 rounded-md"
//         />
//         {formData.image && (
//           <div className="mt-2">
//             <p className="text-gray-700">Image Preview:</p>
//             <img
//               src={URL.createObjectURL(formData.image)}
//               alt="Preview"
//               className="h-40 w-full object-cover rounded-md"
//             />
//           </div>
//         )}
//         {/* If editing, show existing image */}
//         {initialData.imageUrl && !formData.image && (
//           <div className="mt-2">
//             <p className="text-gray-700">Current Image:</p>
//             <img
//               src={initialData.imageUrl}
//               alt={initialData.title}
//               className="h-40 w-full object-cover rounded-md"
//             />
//           </div>
//         )}
//       </div>

//       {/* Additional HTML - TipTap */}
//       <div>
//         <label className="block text-gray-700">Additional Content (Optional)</label>
//         <TipTapEditor
//           content={formData.additionalHTML}
//           onChange={(html) => handleEditorChange('additionalHTML', html)}
//         />
//       </div>

//       {/* Graph HTML - TipTap */}
//       <div>
//         <label className="block text-gray-700">Graph Content (Optional)</label>
//         <TipTapEditor
//           content={formData.graphHTML}
//           onChange={(html) => handleEditorChange('graphHTML', html)}
//         />
//       </div>

//       {/* Error Message */}
//       {error && <p className="text-red-500">{error}</p>}

//       {/* Submit Button */}
//       <button
//         type="submit"
//         className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
//       >
//         {initialData.id ? 'Update Post' : 'Create Post'}
//       </button>
//     </form>
//   );
// };

// export default PostForm;
