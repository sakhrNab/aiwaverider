import { formatDistanceToNow } from 'date-fns';

const formatCommentDate = (date) => {
  if (!date) return 'Just now';
  
  try {
    const commentDate = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(commentDate.getTime())) {
      return 'Invalid date';
    }
    return formatDistanceToNow(commentDate, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Just now';
  }
};

// Update where the date is rendered
<span className="text-gray-500 text-sm">
  {formatCommentDate(comment.createdAt)}
</span> 