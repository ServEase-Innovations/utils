const socket = io('http://localhost:3000'); // Connect to the WebSocket server

// Listen for the 'newServiceProviderEngagement' event from the server
socket.on('newServiceProviderEngagement', (data) => {
  console.log('New service provider engagement inserted:', data);

  // Assuming you have an <ul id="engagementList"> element in your HTML
  const engagementList = document.getElementById('engagementList');
  const listItem = document.createElement('li');
  listItem.textContent = `New Engagement: ${data.engagement_name}`;
  engagementList.appendChild(listItem);
});
