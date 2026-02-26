package com.playplanner.play_be_poc.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JwtUser {

    private Long id;  
    private String email;  
    private String fullName;
    private String role;   

}
