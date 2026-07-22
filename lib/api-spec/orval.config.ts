import { defineConfig, InputTransformerFn } from "orval";
import path from "path";

const root = path.resolve(__dirname, "..", "..");
const checkedClientSrc = path.resolve(root, "lib", "api-client-react", "src");
const apiClientReactSrc = process.env.MOVEWISE_CLIENT_WORKSPACE
  ? path.resolve(process.env.MOVEWISE_CLIENT_WORKSPACE)
  : checkedClientSrc;
const openApiInput = process.env.MOVEWISE_OPENAPI_INPUT
  ? path.resolve(process.env.MOVEWISE_OPENAPI_INPUT)
  : "./openapi.yaml";

// Our exports make assumptions about the title of the API being "Api" (i.e. generated output is `api.ts`).
const titleTransformer: InputTransformerFn = (config) => {
  config.info ??= {};
  config.info.title = "Api";

  return config;
};

export default defineConfig({
  "api-client-react": {
    input: {
      target: openApiInput,
      override: {
        transformer: titleTransformer,
      },
    },
    output: {
      workspace: apiClientReactSrc,
      target: "generated",
      client: "react-query",
      mode: "split",
      baseUrl: "/api",
      clean: true,
      prettier: true,
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: path.resolve(apiClientReactSrc, "custom-fetch.ts"),
          name: "customFetch",
        },
      },
    },
  },
});
