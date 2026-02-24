// utils/videosdk.ts
export const createMeeting = async () => {
  const token = "YOUR_TEMP_TOKEN_HERE"; // replace with env/secure way
  const res = await fetch("https://api.videosdk.live/v2/rooms", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
  });
  const { roomId } = await res.json();
  return roomId;
};
