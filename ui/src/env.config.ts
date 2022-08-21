/**
 * 使用 create-react-app 环境变量能力对 App 配置项的封装
 * 环境变量能力详见: https://create-react-app.dev/docs/adding-custom-environment-variables
 */
import {z} from "zod";

// create-react-app 中 App 使用的环境变量需以 REACT_APP_ 开头
const CONFIG_ENV_PREFIX = "REACT_APP_";

/*
配置项及规则，使用zod声明配置的类型
例如：BACKEND_BASE_URL: z.string().url()
 */
const schema = z.object({
    /**
     * 应用版本号
     */
    VERSION: z.string().min(1)
        .transform(version => `0.0.${version}`)
        .default("-"),
    /**
     * 应用提交id
     */
    COMMIT_ID: z.string().min(1).default("-"),
    /**
     * 应用提交id-short
     */
    COMMIT_ID_SHORT: z.string().min(1).default("-"),
});
type EnvConfigSchema = z.infer<typeof schema>;

// 读取配置项
const config: any = {};
const env = process.env;
for (let envKey in env) {
    if (envKey.startsWith(CONFIG_ENV_PREFIX)) {
        const configKey = envKey.substring(CONFIG_ENV_PREFIX.length);
        config[configKey] = process.env[envKey];
    }
}

// 校验配置项有效性
let checkedConfig;
try {
    checkedConfig = schema.parse(config);
} catch (e) {
    if (e instanceof Error) {
        throw new Error("APP CONFIG ERROR: " + e.message);
    }
    throw new Error("APP CONFIG ERROR: " + e);
}

const EnvConfig = checkedConfig as EnvConfigSchema;
export default EnvConfig;