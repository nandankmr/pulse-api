# Android Development Setup

## Connecting from Android Emulator

The backend server is now configured to accept connections from Android Studio emulator and physical devices.

### Server Configuration

The server has been updated with:

1. **CORS Configuration** - Allows requests from:
   - `http://10.0.2.2:3000` (Android emulator accessing host)
   - `http://10.0.2.2:8081` (Android emulator accessing Metro bundler)
   - `http://localhost:*` (Web development)
   - Local network IPs (for physical devices)

2. **Network Binding** - Server listens on `0.0.0.0` (all network interfaces)

3. **Socket.IO CORS** - WebSocket connections allowed from emulator

### Android Emulator Network

The Android emulator uses a special IP address to access the host machine:

- **Host Machine (your Mac)**: `10.0.2.2`
- **Example**: If your server runs on `localhost:3000`, use `http://10.0.2.2:3000` in the Android app

### API Base URLs

#### For Android Emulator:
```kotlin
// In your Android app configuration
const val BASE_URL = "http://10.0.2.2:3000"
const val SOCKET_URL = "http://10.0.2.2:3000"
```

#### For Physical Android Device:
```kotlin
// Replace with your Mac's local IP address
const val BASE_URL = "http://192.168.x.x:3000"
const val SOCKET_URL = "http://192.168.x.x:3000"
```

To find your Mac's local IP:
```bash
# Run this command in terminal
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### React Native Configuration

If using React Native with Expo or Metro bundler:

```javascript
// config.js
const API_URL = Platform.select({
  android: __DEV__ 
    ? 'http://10.0.2.2:3000'  // Emulator
    : 'http://your-production-url.com',
  ios: __DEV__
    ? 'http://localhost:3000'  // iOS Simulator
    : 'http://your-production-url.com',
});

export default {
  API_URL,
  SOCKET_URL: API_URL,
};
```

### Testing Connection

1. **Start the backend server:**
   ```bash
   npm run dev
   ```

2. **Verify server is accessible:**
   ```bash
   # From your Mac terminal
   curl http://localhost:3000/api-docs
   
   # From Android emulator terminal (adb shell)
   curl http://10.0.2.2:3000/api-docs
   ```

3. **Test from Android app:**
   ```kotlin
   // Simple test in your Android app
   val url = "http://10.0.2.2:3000/api-docs"
   // Make HTTP request and verify response
   ```

### Socket.IO Connection

For real-time features using Socket.IO:

```kotlin
// Android Kotlin example
import io.socket.client.IO
import io.socket.client.Socket

val options = IO.Options().apply {
    auth = mapOf("token" to "your-jwt-token")
    transports = arrayOf("websocket")
}

val socket = IO.socket("http://10.0.2.2:3000", options)

socket.on(Socket.EVENT_CONNECT) {
    println("Connected to Socket.IO server")
}

socket.connect()
```

```javascript
// React Native example
import io from 'socket.io-client';

const socket = io('http://10.0.2.2:3000', {
  auth: {
    token: 'your-jwt-token'
  },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Connected to Socket.IO server');
});
```

### Troubleshooting

#### Connection Refused
- Ensure the backend server is running
- Check that server is listening on `0.0.0.0` (not just `localhost`)
- Verify firewall isn't blocking the port

#### CORS Errors
- Check that the origin is included in the CORS configuration
- For custom origins, set `SOCKET_CORS_ORIGINS` environment variable:
  ```bash
  SOCKET_CORS_ORIGINS=http://10.0.2.2:3000,http://localhost:3000
  ```

#### Physical Device Can't Connect
- Ensure your Mac and Android device are on the same WiFi network
- Use your Mac's local IP address (not `10.0.2.2`)
- Check that your Mac's firewall allows incoming connections on port 3000

#### Socket.IO Connection Issues
- Use `transports: ['websocket']` to avoid polling fallback
- Ensure JWT token is valid and not expired
- Check Socket.IO server logs for authentication errors

### Environment Variables

You can customize CORS origins via environment variable:

```bash
# .env file
SOCKET_CORS_ORIGINS=http://10.0.2.2:3000,http://10.0.2.2:8081,http://localhost:3000
```

### Security Notes

⚠️ **Production Configuration**

The current CORS configuration is permissive for development. For production:

1. **Restrict CORS origins** to your actual frontend domains
2. **Use HTTPS** for all connections
3. **Implement rate limiting**
4. **Use environment-specific configurations**

```javascript
// Production example
const corsOrigins = process.env.NODE_ENV === 'production'
  ? ['https://your-app.com']
  : ['http://10.0.2.2:3000', 'http://localhost:3000'];
```

### Server Startup Messages

When you start the server, you'll see:

```
🚀 Server running on port 3000
📚 API Documentation: http://localhost:3000/api-docs
🔌 Socket.IO ready on /socket.io
📱 Android Emulator: Use http://10.0.2.2:3000
📱 Physical Device: Use http://<your-local-ip>:3000
```

### Quick Reference

| Environment | Base URL | Notes |
|------------|----------|-------|
| Android Emulator | `http://10.0.2.2:3000` | Special IP for host machine |
| iOS Simulator | `http://localhost:3000` | Can use localhost directly |
| Physical Device | `http://192.168.x.x:3000` | Use Mac's local IP |
| Web Browser | `http://localhost:3000` | Standard localhost |

---

**Need Help?**

If you encounter issues:
1. Check server logs for errors
2. Verify network connectivity
3. Test with `curl` or Postman first
4. Check Android logcat for client-side errors
