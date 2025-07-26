#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { execSync } = require('child_process');
const path = require('path');

class CloudBuildMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'cloudbuild-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'deploy_to_cloud_run',
          description: 'Deploy the browser fighting game to Google Cloud Run using Cloud Build',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: {
                type: 'string',
                description: 'Google Cloud Project ID'
              },
              substitutions: {
                type: 'object',
                description: 'Build substitutions (optional)',
                additionalProperties: { type: 'string' }
              }
            },
            required: ['project_id']
          }
        },
        {
          name: 'check_build_status',
          description: 'Check the status of recent Cloud Build deployments',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: {
                type: 'string',
                description: 'Google Cloud Project ID'
              },
              limit: {
                type: 'number',
                description: 'Number of recent builds to show (default: 5)',
                default: 5
              }
            },
            required: ['project_id']
          }
        },
        {
          name: 'get_service_url',
          description: 'Get the URL of the deployed Cloud Run service',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: {
                type: 'string',
                description: 'Google Cloud Project ID'
              },
              service_name: {
                type: 'string',
                description: 'Cloud Run service name',
                default: 'browser-fighting-game'
              },
              region: {
                type: 'string',
                description: 'Cloud Run region',
                default: 'us-central1'
              }
            },
            required: ['project_id']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'deploy_to_cloud_run':
            return await this.deployToCloudRun(args);
          case 'check_build_status':
            return await this.checkBuildStatus(args);
          case 'get_service_url':
            return await this.getServiceUrl(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ]
        };
      }
    });
  }

  async deployToCloudRun(args) {
    const { project_id, substitutions = {} } = args;
    
    // Build the gcloud command
    let command = `gcloud builds submit --config=cloudbuild.yaml --project=${project_id}`;
    
    // Add substitutions if provided
    if (Object.keys(substitutions).length > 0) {
      const subsList = Object.entries(substitutions)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
      command += ` --substitutions=${subsList}`;
    }

    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Cloud Build deployment started successfully!\n\nOutput:\n${output}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Cloud Build failed: ${error.message}`);
    }
  }

  async checkBuildStatus(args) {
    const { project_id, limit = 5 } = args;
    
    try {
      const command = `gcloud builds list --project=${project_id} --limit=${limit} --format="table(id,status,createTime,duration,source.repoSource.repoName)"`;
      const output = execSync(command, { encoding: 'utf8' });

      return {
        content: [
          {
            type: 'text',
            text: `📊 Recent Cloud Build Status:\n\n${output}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to check build status: ${error.message}`);
    }
  }

  async getServiceUrl(args) {
    const { project_id, service_name = 'browser-fighting-game', region = 'us-central1' } = args;
    
    try {
      const command = `gcloud run services describe ${service_name} --region=${region} --project=${project_id} --format="value(status.url)"`;
      const url = execSync(command, { encoding: 'utf8' }).trim();

      return {
        content: [
          {
            type: 'text',
            text: `🌐 Service URL: ${url}\n\nYour browser fighting game is live at: ${url}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get service URL: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Cloud Build MCP server running on stdio');
  }
}

const server = new CloudBuildMCPServer();
server.run().catch(console.error);