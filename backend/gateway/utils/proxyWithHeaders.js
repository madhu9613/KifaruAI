import proxy from "express-http-proxy";

export const proxyWithUser = (serviceUrl, proxyOptions = {}) => {
  return proxy(serviceUrl, {
    ...proxyOptions, // allows overriding bufferResponse, etc.
    limit: proxyOptions.limit || "50mb", 
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (srcReq.user) {
        proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
        proxyReqOpts.headers["x-user-email"] = srcReq.user.email;
        proxyReqOpts.headers["x-user-avatar"] = srcReq.user.avatar;
      }
      return proxyReqOpts;
    }
  });
};