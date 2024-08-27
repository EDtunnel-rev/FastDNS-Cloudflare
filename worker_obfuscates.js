addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * XOR encryption/decryption function.
 * @param {string} str - The string to be encrypted/decrypted.
 * @param {string} key - The key used for XOR operation.
 * @returns {string} - The resulting string after XOR operation.
 */
function xorEncryptDecrypt(str, key) {
  let result = ''
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return result
}

/**
 * Obfuscates a string using XOR encryption and base64 encoding.
 * @param {string} str - The string to be obfuscated.
 * @param {string} key - The key used for XOR encryption.
 * @returns {string} - The obfuscated string.
 */
function obfuscate(str, key) {
  const xorResult = xorEncryptDecrypt(str, key)
  return btoa(xorResult)
}

/**
 * Deobfuscates a base64 encoded string using XOR decryption.
 * @param {string} str - The string to be deobfuscated.
 * @param {string} key - The key used for XOR decryption.
 * @returns {string} - The deobfuscated string.
 */
function deobfuscate(str, key) {
  const base64Decoded = atob(str)
  return xorEncryptDecrypt(base64Decoded, key)
}

/**
 * Handle the incoming request and apply obfuscation or deobfuscation.
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleRequest(request) {
  // Define the key to be used for XOR encryption
  const encryptionKey = 'my-secret-key' // Change this to your secret key

  // Get the URL of the incoming request
  let url = new URL(request.url)

  // Check if the request has an 'X-Obfuscate' header
  if (request.headers.get('X-Obfuscate')) {
    // Deobfuscate the URL path
    url.pathname = '/' + deobfuscate(url.pathname.slice(1), encryptionKey)

    // Create a new request with the deobfuscated URL
    request = new Request(url.toString(), request)
  }

  // Handle the request, for example, fetch the original resource
  let response = await fetch(request)

  // Obfuscate the response body if needed
  if (url.searchParams.has('obfuscateResponse')) {
    let originalBody = await response.text()
    let obfuscatedBody = obfuscate(originalBody, encryptionKey)

    return new Response(obfuscatedBody, response)
  }

  return response
}
