// IPFS utilities - Re-exports mock IPFS for compatibility
// In production, replace with real IPFS/Pinata implementation

const ipfsMock = require('./ipfs-mock');

module.exports = {
  uploadToIPFS: ipfsMock.uploadToIPFS,
  pinFile: ipfsMock.pinFile,
  validateCID: ipfsMock.validateCID,
  getFile: ipfsMock.getFile || (() => Promise.reject(new Error('Not implemented'))),
  
  // Additional exports for compatibility
  initializeIPFS: ipfsMock.initializeMockIPFS || (() => {}),
  getMockStatus: () => ({ 
    provider: 'mock',
    connected: true,
    message: 'Using mock IPFS for development'
  })
};
