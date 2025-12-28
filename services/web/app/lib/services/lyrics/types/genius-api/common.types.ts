// Common types shared across Genius API responses
export interface Meta {
	status: number
}

export interface UserAvatar {
	tiny: {
		url: string
		bounding_box: {
			width: number
			height: number
		}
	}
	thumb: {
		url: string
		bounding_box: {
			width: number
			height: number
		}
	}
	small: {
		url: string
		bounding_box: {
			width: number
			height: number
		}
	}
}

export interface UserMetadataInteractions {
	following?: boolean
	cosign?: boolean
	pyong?: boolean
	vote?: unknown
}

export interface UserMetadata {
	permissions?: unknown[]
	excluded_permissions: string[]
	interactions: UserMetadataInteractions
	iq_by_action?: Record<string, number>
}

export interface User {
	api_path: string
	avatar: UserAvatar
	header_image_url: string
	human_readable_role_for_display?: string
	id: number
	iq?: number
	login: string
	name: string
	role_for_display?: string
	url: string
	current_user_metadata: UserMetadata
}
