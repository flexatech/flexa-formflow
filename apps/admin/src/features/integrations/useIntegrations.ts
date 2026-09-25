import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type IntegrationStatus = "active" | "available" | "soon";

export interface IntegrationCard {
    id: string;
    title: string;
    description: string;
    category: string;
    status: IntegrationStatus;
    detail: string;
}

export interface DeliveryStatus {
    active: boolean;
    label: string;
}

export interface IntegrationsResponse {
    integrations: IntegrationCard[];
    delivery: DeliveryStatus;
}

export function useIntegrations() {
    return useQuery({
        queryKey: ["integrations"],
        queryFn: async () => api.get<IntegrationsResponse>("/integrations"),
    });
}
