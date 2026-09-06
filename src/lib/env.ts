import { PUBLIC_WEB3FORMS_ACCESS_KEY } from "astro:env/client";

export const web3FormsAccessKey = PUBLIC_WEB3FORMS_ACCESS_KEY;
export const isFormsConfigured = Boolean(web3FormsAccessKey);
