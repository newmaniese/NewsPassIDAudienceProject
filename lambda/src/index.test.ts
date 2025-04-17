import { handler } from './index';
import { S3 } from 'aws-sdk';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { Request, AWSError, Response } from 'aws-sdk/lib/core';
import { PromiseResult } from 'aws-sdk/lib/request';

interface MockS3Response<T> extends Request<T, AWSError> {
  promise: () => Promise<PromiseResult<T, AWSError>>;
}

jest.mock('aws-sdk', () => {
  const mockS3 = {
    getObject: jest.fn(),
    putObject: jest.fn()
  };
  return {
    S3: jest.fn(() => mockS3)
  };
});

describe('NewsPassID Lambda Handler', () => {
  const mockS3 = new S3() as jest.Mocked<S3>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STORAGE_BUCKET = 'test-bucket';
    process.env.ID_FOLDER = 'newspassid';
  });

  it('should process valid request and return success', async () => {
    // Mock S3 responses
    mockS3.getObject.mockReturnValue({
      promise: () => Promise.resolve({
        Body: Buffer.from('segments,expire_timestamp\nsegment1,9999999999999'),
        $response: {} as Response<S3.GetObjectOutput, AWSError>
      })
    } as MockS3Response<S3.GetObjectOutput>);
    mockS3.putObject.mockReturnValue({
      promise: () => Promise.resolve({
        $response: {} as Response<S3.PutObjectOutput, AWSError>
      })
    } as MockS3Response<S3.PutObjectOutput>);

    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({
        id: 'publisher-123',
        timestamp: 1234567890,
        url: 'https://example.com',
        consentString: 'consent123',
        previousId: 'publisher-122',
        publisherSegments: ['seg1', 'seg2']
      }),
      headers: {
        origin: 'https://example.com'
      }
    };

    const response = await handler(event as APIGatewayProxyEvent);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      success: true,
      id: 'publisher-123',
      segments: ['segment1']
    });

    // Verify S3 calls
    expect(mockS3.putObject).toHaveBeenCalledTimes(2);
    expect(mockS3.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'test-bucket',
        Key: 'newspassid/publisher/example.com/publisher-123/1234567890.csv',
        ContentType: 'text/csv'
      })
    );
  });

  it('should handle missing required fields', async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({
        id: 'publisher-123',
        timestamp: 1234567890
        // Missing url and consentString
      })
    };

    const response = await handler(event as APIGatewayProxyEvent);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      success: false,
      error: 'Missing required fields. All requests must include id, timestamp, url, and consentString.'
    });
  });

  it('should handle invalid ID format', async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({
        id: 'invalid-id-without-publisher-prefix',
        timestamp: 1234567890,
        url: 'https://example.com',
        consentString: 'consent123'
      })
    };

    const response = await handler(event as APIGatewayProxyEvent);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      success: false,
      error: 'Invalid ID format'
    });
  });

  it('should handle S3 errors gracefully', async () => {
    mockS3.getObject.mockReturnValue({
      promise: () => Promise.reject(new Error('S3 Error'))
    } as MockS3Response<S3.GetObjectOutput>);

    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({
        id: 'publisher-123',
        timestamp: 1234567890,
        url: 'https://example.com',
        consentString: 'consent123'
      })
    };

    const response = await handler(event as APIGatewayProxyEvent);
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      success: false,
      error: 'Internal server error'
    });
  });
}); 