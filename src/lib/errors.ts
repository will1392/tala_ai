export type NormalizedError = {
  code: string;                // e.g. S3_BUCKET_NOT_FOUND
  title: string;
  message: string;
  docsHref?: string;           // troubleshooting link
};

export function normalizeError(e: any): NormalizedError {
  // prefer server-provided codes
  const code = e?.code || e?.response?.data?.code || "UNKNOWN";
  
  // Also check for specific error messages that indicate known issues
  const errorMessage = e?.message || e?.response?.data?.message || e?.response?.data?.error || "";
  
  // Check for S3-specific errors
  if (errorMessage.includes("AccessDenied") || errorMessage.includes("Access Denied")) {
    return {
      code: "S3_ACCESS_DENIED",
      title: "Upload denied",
      message: "Access to the S3 bucket was denied. Verify the credentials and bucket policy.",
      docsHref: "/docs/troubleshooting#s3-access"
    };
  }
  
  if (errorMessage.includes("NoSuchBucket") || errorMessage.includes("bucket not found")) {
    return {
      code: "S3_BUCKET_NOT_FOUND",
      title: "Document upload failed: bucket not found",
      message: "We couldn't find the configured S3 bucket. Check your .env S3_BUCKET and IAM permissions, then retry.",
      docsHref: "/docs/troubleshooting#s3-bucket-not-found"
    };
  }
  
  // Check for Qdrant-specific errors
  if (errorMessage.includes("collection") && (errorMessage.includes("not found") || errorMessage.includes("does not exist"))) {
    return {
      code: "QDRANT_MISSING_COLLECTIONS",
      title: "Vector index not ready",
      message: "One or more Qdrant collections are missing. Create them to enable semantic search.",
      docsHref: "/docs/troubleshooting#qdrant-collections"
    };
  }
  
  // Check for network errors
  if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ERR_CONNECTION_REFUSED")) {
    return {
      code: "CONNECTION_REFUSED",
      title: "Connection failed",
      message: "Unable to connect to the server. Please check if the server is running.",
      docsHref: "/docs/troubleshooting#connection-refused"
    };
  }
  
  if (errorMessage.includes("ERR_NETWORK") || errorMessage.includes("Network Error")) {
    return {
      code: "NETWORK_ERROR",
      title: "Network error",
      message: "Unable to reach the server. Please check your internet connection.",
      docsHref: "/docs/troubleshooting#network-error"
    };
  }
  
  // Check for auth errors
  if (errorMessage.includes("unauthorized") || errorMessage.includes("401")) {
    return {
      code: "UNAUTHORIZED",
      title: "Authentication required",
      message: "Please log in to continue.",
      docsHref: "/docs/troubleshooting#authentication"
    };
  }
  
  // Handle specific codes
  switch (code) {
    case "S3_BUCKET_NOT_FOUND":
      return {
        code,
        title: "Document upload failed: bucket not found",
        message: "We couldn't find the configured S3 bucket. Check your .env S3_BUCKET and IAM permissions, then retry.",
        docsHref: "/docs/troubleshooting#s3-bucket-not-found"
      };
    case "S3_ACCESS_DENIED":
      return {
        code,
        title: "Upload denied",
        message: "Access to the S3 bucket was denied. Verify the credentials and bucket policy.",
        docsHref: "/docs/troubleshooting#s3-access"
      };
    case "QDRANT_MISSING_COLLECTIONS":
      return {
        code,
        title: "Vector index not ready",
        message: "One or more Qdrant collections are missing. Create them to enable semantic search.",
        docsHref: "/docs/troubleshooting#qdrant-collections"
      };
    case "GATEWAY_TIMEOUT":
      return {
        code,
        title: "Request timed out",
        message: "The server took too long to respond. Please try again.",
        docsHref: "/docs/troubleshooting#gateway-timeout"
      };
    default:
      return {
        code,
        title: "Something went wrong",
        message: (errorMessage || "An unexpected error occurred. Please try again.") as string
      };
  }
}