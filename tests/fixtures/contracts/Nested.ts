export type ComplexResult = {
    success: boolean;
    data: Array<{
        itemId: string;
        value: number;
    }>;
    error?: {
        code: number;
        message: string;
    };
};

export interface GenericApi {
    endpoint: string;
    response: ComplexResult;
}
