import { useCallback } from "react";
import api from "../../services/api";

const usePlans = () => {

    const findAll = useCallback(async (params) => {
        const { data } = await api.request({
            url: `/helps`,
            method: 'GET',
            params
        });
        return data;
    }, []);

    const list = useCallback(async (params) => {
        const { data } = await api.request({
            url: '/helps/list',
            method: 'GET',
            params
        });
        return data;
    }, []);

    const save = useCallback(async (data) => {
        const { data: responseData } = await api.request({
            url: '/helps',
            method: 'POST',
            data
        });
        return responseData;
    }, []);

    const update = useCallback(async (data) => {
        const { data: responseData } = await api.request({
            url: `/helps/${data.id}`,
            method: 'PUT',
            data
        });
        return responseData;
    }, []);

    const remove = useCallback(async (id) => {
        const { data } = await api.request({
            url: `/helps/${id}`,
            method: 'DELETE'
        });
        return data;
    }, []);

    const listAreas = useCallback(async () => {
        const { data } = await api.request({
            url: '/helps/areas',
            method: 'GET'
        });
        return data;
    }, []);

    const findByArea = useCallback(async (areaKey) => {
        const { data } = await api.request({
            url: `/helps/by-area/${areaKey}`,
            method: 'GET'
        });
        return data;
    }, []);

    const uploadAttachment = useCallback(async (helpId, file) => {
        const formData = new FormData();
        formData.append("file", file);
        const { data } = await api.request({
            url: `/helps/${helpId}/attachments`,
            method: 'POST',
            data: formData,
            headers: { "Content-Type": "multipart/form-data" }
        });
        return data;
    }, []);

    const removeAttachment = useCallback(async (helpId, attachmentId) => {
        const { data } = await api.request({
            url: `/helps/${helpId}/attachments/${attachmentId}`,
            method: 'DELETE'
        });
        return data;
    }, []);

    return {
        findAll,
        list,
        save,
        update,
        remove,
        listAreas,
        findByArea,
        uploadAttachment,
        removeAttachment
    }
}

export default usePlans;
